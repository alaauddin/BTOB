from .models import SystemSettings, Supplier
from django.urls import resolve
from core.utils.merchant_utils import get_active_supplier


def system_settings(request):
    """
    Context processor to make system settings and navigation state available in all templates.
    """
    try:
        settings = SystemSettings.objects.first()
    except Exception:
        settings = None

    # --- Adaptive Navigation State Logic ---
    user = request.user
    nav_state = 'visitor' # Default
    active_store = None
    user_stores_count = 0

    if user.is_authenticated:
        # Use our new utility to get the active context
        active_store = get_active_supplier(request)
        
        # Calculate how many stores this user is involved in
        owned_count = 1 if hasattr(user, 'supplier') and user.supplier else 0
        managed_count = user.managed_suppliers.count()
        user_stores_count = owned_count + managed_count
        
        if user_stores_count > 0:
            if user_stores_count > 1:
                nav_state = 'multi_merchant'
            else:
                nav_state = 'merchant'
        else:
            # User logged in but NO store association
            nav_state = 'onboarding'
             
        # --- Context Override for Storefront Views ---
        # If a merchant is viewing a store page (buying mode), force visitor state
        try:
            if request.resolver_match:
                view_name = request.resolver_match.url_name
                storefront_views = [
                    'product-list', 'product_list_category', 'product_list_subcategory',
                    'store_home', 'store_catalog', 'product_canonical', 
                    'store_cart', 'store_checkout', 'store_order_track',
                    'store_category', 'store_subcategory',
                    'add_to_cart', 'sub_to_cart', 'remove_item',
                    'product_detail'
                ]
                if view_name in storefront_views:
                    nav_state = 'visitor'
        except Exception:
            pass

    else:
        nav_state = 'visitor'

    return {
        'system_settings': settings,
        'css_version': '1.38.0', # Bump version for Meta Pixel integration
        'nav_state': nav_state,
        'active_store': active_store,
        'user_stores_count': user_stores_count,
    }
