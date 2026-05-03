from django.http import JsonResponse
from django.urls import resolve
from django.utils import timezone
import logging
from .models import Subscription

logger = logging.getLogger(__name__)

class SubscriptionMiddleware:
    """
    Middleware to ensure that suppliers have an active subscription 
    before accessing merchant-related endpoints.
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # 1. Exempt only the Django admin interface itself from subscription checks
        if request.path.startswith('/admin/'):
            return self.get_response(request)

        # 2. Identify if this is a merchant-related API request
        try:
            resolver_match = resolve(request.path_info)
            view_name = resolver_match.view_name if resolver_match else ""
        except:
            view_name = ""

        # List of exempt views
        exempt_views = [
            'subscriptions:status',
            'subscriptions:plan_list',
            'subscriptions:payment_methods',
            'subscriptions:submit_payment',
            'subscriptions:subscribe',
            'mobile_api:merchant_switch',
            'mobile_api:merchant_profile',
            'mobile_api:login',
            'mobile_api:signup',
            'mobile_api:unified_login',
            'mobile_api:token_refresh',
        ]

        is_merchant_view = view_name.startswith('mobile_api:merchant_') or view_name.startswith('mobile_api:wholesale_')
        
        if is_merchant_view and view_name not in exempt_views:
            # IMPORTANT: For JWT requests, request.user might not be populated yet.
            if not request.user.is_authenticated:
                from rest_framework_simplejwt.authentication import JWTAuthentication
                try:
                    auth = JWTAuthentication().authenticate(request)
                    if auth:
                        request.user = auth[0]
                except:
                    pass

            if request.user.is_authenticated:
                # 3. Identify the target supplier
                merchant_id = request.GET.get('merchant_id') or request.POST.get('merchant_id')
                supplier = None

                from core.models import Supplier
                if merchant_id:
                    if request.user.is_superuser:
                        supplier = Supplier.objects.filter(id=merchant_id).first()
                    else:
                        from django.db.models import Q
                        supplier = Supplier.objects.filter(
                            Q(user=request.user) | Q(managing_users=request.user), 
                            id=merchant_id
                        ).first()
                else:
                    if hasattr(request.user, 'supplier'):
                        supplier = request.user.supplier
                    elif hasattr(request.user, 'managed_suppliers'):
                        supplier = request.user.managed_suppliers.first()

                if supplier:
                    # 4. Check for ANY subscription records
                    all_subs = Subscription.objects.filter(supplier=supplier)
                    
                    if not all_subs.exists():
                        # If no plan was ever active/started, no subscription is needed yet
                        active_sub = True
                    else:
                        # If they have a history, check if any is currently active
                        active_sub = all_subs.filter(
                            status='active', 
                            end_date__gt=timezone.now()
                        ).exists()

                    # Bypass for superusers or if active sub exists
                    if request.user.is_superuser:
                        active_sub = True

                    if not active_sub:
                        logger.info(f"Access Denied: No active sub for {supplier} (ID: {supplier.id})")
                        
                        # Check if there's a pending payment
                        from .models import SubscriptionPayment
                        has_pending_payment = SubscriptionPayment.objects.filter(
                            subscription__supplier=supplier,
                            status='pending'
                        ).exists()

                        from core.models import SystemSettings
                        settings = SystemSettings.objects.first()
                        contact_number = settings.whatsapp_number or settings.customer_service_number if settings else "+967 777 777 777"

                        if has_pending_payment:
                            return JsonResponse({
                                'success': False,
                                'error_code': 'PAYMENT_UNDER_REVIEW',
                                'message': 'طلب اشتراكك قيد المراجعة حالياً. سيتم تفعيل حسابك فور التأكد من عملية الدفع.',
                                'contact_number': contact_number
                            }, status=402)
                        
                        return JsonResponse({
                            'success': False,
                            'error_code': 'SUBSCRIPTION_EXPIRED',
                            'message': 'يرجى تجديد الاشتراك للوصول إلى هذه الميزة.',
                            'contact_number': contact_number
                        }, status=402)

        return self.get_response(request)
