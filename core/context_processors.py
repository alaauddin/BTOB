from .models import SystemSettings
from django.urls import resolve


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
        # Check if user has a supplier profile (OneToOne)
        # In a multi-tenant future, this might check a ManyToMany or ForeignKey reverse relation
        try:
            if hasattr(user, 'supplier') and user.supplier:
                # User IS a merchant
                active_store = user.supplier
                user_stores_count = 1 
                # If we had a way to check for multiple stores:
                # user_stores_count = user.suppliers.count() 
                
                if user_stores_count > 1:
                    nav_state = 'multi_merchant'
                else:
                    nav_state = 'merchant'
            else:
                # User logged in but NO store
                nav_state = 'onboarding'
        except Exception:
             nav_state = 'onboarding' # Fallback if DB error on accessing relation
             
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
        'css_version': '2.8.0', # Bump version for nav changes
        'nav_state': nav_state,
        'active_store': active_store,
        'user_stores_count': user_stores_count,
    }
