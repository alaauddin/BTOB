from django.shortcuts import redirect, get_object_or_404
from django.urls import reverse
from core.models import Supplier

class NavigationMiddleware:
    """
    Middleware to handle flow-based routing logic:
    1. Dashboard Access Control (Auth + Store Ownership)
    2. Storefront Context Injection (slug validation)
    3. Onboarding Redirects
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        path = request.path_info
        user = request.user

        # --- 1. Dashboard Guard ---
        if path.startswith('/dashboard/'):
            # Must be logged in
            if not user.is_authenticated:
                return redirect(f"{reverse('login')}?next={path}")
            
            # Must have a store to access dashboard
            # Exception: creating a store
            if not getattr(user, 'supplier', None):
                return redirect('join_business')

        # --- 2. Onboarding Guard ---
        if path.startswith('/start/'):
            # If already has store, redirect to dashboard
            if user.is_authenticated and getattr(user, 'supplier', None):
                return redirect('dashboard_overview')

        # --- 3. Store Context Injection (Storefront) ---
        # This part relies on view processing, so we might need process_view
        # constructing it here for now in __call__ is tricky as we need resolved URL args
        
        response = self.get_response(request)
        return response

    def process_view(self, request, view_func, view_args, view_kwargs):
        """
        Handle context injection based on URL parameters.
        """
        # Inject Store Context for Storefront Views
        if 'store_slug' in view_kwargs:
            try:
                # Get store by slug
                store = Supplier.objects.get(store_id=view_kwargs['store_slug'])
                request.current_store = store
            except Supplier.DoesNotExist:
                # If store not found by slug, it might be a 404
                # Let the view handle it or raise 404 here
                pass 
        
        return None


class VisitTrackingMiddleware:
    """
    Middleware to record every page visit into the WebsiteStatistic table.
    Skips static files, media, admin, and AJAX requests for efficiency.
    """

    # URL prefixes to ignore (static assets, admin, API internals)
    SKIP_PREFIXES = (
        '/static/', '/media/', '/admin/', '/favicon.ico',
        '/__debug__/', '/api/',
    )

    # Map URL names → page_type values
    PAGE_TYPE_MAP = {
        'landing': 'landing',
        'suppliers_list': 'landing',
        'product-list': 'product_list',
        'product_list_category': 'product_list',
        'product_list_subcategory': 'product_list',
        'product_detail': 'product_detail',
        'product_canonical': 'product_detail',
        'cart-detail': 'cart',
        'store_cart': 'cart',
        'checkout': 'checkout',
        'store_checkout': 'checkout',
        'order_detail': 'order_detail',
        'my_orders': 'order_detail',
        'join_business': 'join_business',
        'profile': 'profile',
        'edit_profile': 'profile',
    }

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)

        # Skip non-page requests
        path = request.path_info
        if any(path.startswith(prefix) for prefix in self.SKIP_PREFIXES):
            return response

        # Skip AJAX / fetch requests
        if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
            return response

        # Only track GET requests (page views)
        if request.method != 'GET':
            return response

        # Skip non-HTML responses
        content_type = response.get('Content-Type', '')
        if 'text/html' not in content_type:
            return response

        try:
            self._record_visit(request, response)
        except Exception:
            # Never let tracking break the site
            import logging
            logging.getLogger(__name__).exception("Visit tracking error")

        return response

    def _record_visit(self, request, response):
        """Create a WebsiteStatistic record for this page visit."""
        from core.models import WebsiteStatistic, Supplier

        ua_string = request.META.get('HTTP_USER_AGENT', '')
        device_type, browser, operating_system = self._parse_user_agent(ua_string)

        # Skip bots to keep data clean
        if device_type == 'bot':
            return

        # Determine page type from URL name
        page_type = 'other'
        supplier = None
        if request.resolver_match:
            url_name = request.resolver_match.url_name or ''
            page_type = self.PAGE_TYPE_MAP.get(url_name, 'other')

            # Check for dashboard views
            if request.path_info.startswith('/dashboard/'):
                page_type = 'merchant_dashboard'

            # Extract supplier from URL kwargs
            store_id = (
                request.resolver_match.kwargs.get('store_id')
                or request.resolver_match.kwargs.get('store_slug')
            )
            if store_id:
                try:
                    supplier = Supplier.objects.get(store_id=store_id)
                except Supplier.DoesNotExist:
                    pass

        # Build absolute URL
        url = request.build_absolute_uri()[:2048]

        # Get referrer
        referrer = request.META.get('HTTP_REFERER', '')[:2048]

        # Get IP
        ip_address = self._get_client_ip(request)

        # Get session key
        session_key = ''
        if hasattr(request, 'session') and request.session.session_key:
            session_key = request.session.session_key

        # Get user
        user = request.user if request.user.is_authenticated else None

        WebsiteStatistic.objects.create(
            url=url,
            page_type=page_type,
            method=request.method,
            ip_address=ip_address,
            user_agent=ua_string[:500],
            device_type=device_type,
            browser=browser,
            operating_system=operating_system,
            referrer=referrer,
            user=user,
            session_key=session_key,
            supplier=supplier,
            response_status=response.status_code,
        )

    @staticmethod
    def _get_client_ip(request):
        """Extract the real client IP, accounting for proxies."""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            return x_forwarded_for.split(',')[0].strip()
        return request.META.get('REMOTE_ADDR')

    @staticmethod
    def _parse_user_agent(ua_string):
        """
        Parse a user-agent string to extract device type, browser, and OS.
        Lightweight implementation — no external dependencies required.

        Parameters:
            ua_string: The raw user-agent header string.

        Returns:
            Tuple of (device_type, browser, operating_system).
        """
        ua = ua_string.lower()

        # --- Detect Bots ---
        bot_keywords = ['bot', 'crawl', 'spider', 'slurp', 'mediapartners', 'headless']
        if any(kw in ua for kw in bot_keywords):
            return 'bot', '', ''

        # --- Detect OS ---
        operating_system = 'غير معروف'
        if 'windows' in ua:
            operating_system = 'Windows'
        elif 'mac os' in ua or 'macintosh' in ua:
            operating_system = 'macOS'
        elif 'iphone' in ua or 'ipad' in ua:
            operating_system = 'iOS'
        elif 'android' in ua:
            operating_system = 'Android'
        elif 'linux' in ua:
            operating_system = 'Linux'

        # --- Detect Device ---
        device_type = 'desktop'
        if 'ipad' in ua or 'tablet' in ua:
            device_type = 'tablet'
        elif any(kw in ua for kw in ['iphone', 'android', 'mobile', 'phone']):
            device_type = 'mobile'

        # --- Detect Browser ---
        browser = 'غير معروف'
        if 'edg/' in ua or 'edge/' in ua:
            browser = 'Edge'
        elif 'opr/' in ua or 'opera' in ua:
            browser = 'Opera'
        elif 'chrome/' in ua and 'chromium' not in ua:
            browser = 'Chrome'
        elif 'safari/' in ua and 'chrome' not in ua:
            browser = 'Safari'
        elif 'firefox/' in ua:
            browser = 'Firefox'

        return device_type, browser, operating_system
