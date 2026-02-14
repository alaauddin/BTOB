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
