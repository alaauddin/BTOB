"""Storefront URL patterns — used when a subdomain is detected.

These URLs are activated by ``SubdomainMiddleware`` which sets
``request.urlconf = 'core.urls_storefront'`` when a valid supplier
subdomain is present.  The supplier (tenant) is available on every
request as ``request.tenant``.

No ``store_slug`` prefix is needed because the tenant is already
resolved from the subdomain.

Strategy:
    1. Define clean storefront-specific routes first (/, /p/<id>/, etc.)
    2. Include the full platform URL conf as a fallback so that shared
       templates (base.html, navbar_top.html) can still resolve legacy
       URL names like 'add_to_cart', 'suppliers_list', 'join_business'.
"""

from django.contrib import admin
from django.urls import path, include, re_path
from django.conf import settings
from django.conf.urls.static import static
from django.views.static import serve

from core.views.ProductListView import product_list
from core.views.ProductDetailView import product_detail
from core.views.CartView import CartView, add_to_cart, sub_to_cart, get_cart_status
from core.views.CartView import DecreaseQuantityView, IncreaseQuantityView, RemoveItemView
from core.views.ConvertCartToOrder import checkout_select_address_or_custom_address
from core.views import ConvertCartToOrder
from core.views.OrderDetailView import order_detail_view
from core.views.OrderListView import order_list_view
from core.views.PaymentDetailView import PaymentDetailView
from core.views.AddReview import AddReviewView
from core.views.add_to_wish_list import toggle_wishlist, get_wishlist_status
from core.views.profile import profile_view, address_list_view, set_current_address

urlpatterns = [
    # ==============================
    # Storefront (subdomain-resolved)
    # ==============================
    # These take priority over the fallback platform URLs below.

    # Product catalog (home page of the subdomain store)
    path('', product_list, name='storefront_home'),
    path('shop/', product_list, name='storefront_catalog'),
    path('c/<int:category_id>/', product_list, name='storefront_category'),
    path('sc/<int:subcategory_id>/', product_list, name='storefront_subcategory'),

    # Product detail
    path('p/<int:pk>/', product_detail, name='storefront_product_detail'),

    # Cart
    path('cart/', CartView.as_view(), name='storefront_cart'),
    path('cart/add/<int:product_id>/', add_to_cart, name='storefront_add_to_cart'),
    path('cart/sub/<int:product_id>/', sub_to_cart, name='storefront_sub_to_cart'),
    path('cart/status/', get_cart_status, name='storefront_cart_status'),
    path('cart/increase/<int:item_id>/', IncreaseQuantityView.as_view(), name='storefront_increase_qty'),
    path('cart/decrease/<int:item_id>/', DecreaseQuantityView.as_view(), name='storefront_decrease_qty'),
    path('cart/remove/<int:item_id>/', RemoveItemView.as_view(), name='storefront_remove_item'),

    # Checkout
    path('checkout/', checkout_select_address_or_custom_address, name='storefront_checkout'),
    path('checkout/existing-address/', ConvertCartToOrder.existing_address, name='storefront_existing_address'),

    # Orders
    path('orders/', order_list_view, name='storefront_orders'),
    path('orders/<int:pk>/', order_detail_view, name='storefront_order_detail'),

    # Payment
    path('payments/<int:pk>/', PaymentDetailView.as_view(), name='storefront_payment'),

    # Reviews
    path('review/<int:product_id>/', AddReviewView.as_view(), name='storefront_add_review'),

    # Wishlist
    path('wishlist/toggle/<int:product_id>/', toggle_wishlist, name='storefront_toggle_wishlist'),
    path('wishlist/status/<int:product_id>/', get_wishlist_status, name='storefront_wishlist_status'),

    # Profile (shared across platform and storefront)
    path('profile/', profile_view, name='storefront_profile'),
    path('profile/addresses/', address_list_view, name='storefront_address_list'),
    path('profile/addresses/set/<int:pk>/', set_current_address, name='storefront_set_address'),

    # ------------------------------------------------------------------
    # Fallback: include the full platform URL conf so shared templates
    # (base.html, navbar_top.html, etc.) can resolve legacy URL names.
    # Storefront-specific routes above take priority since they're first.
    # ------------------------------------------------------------------
    path('', include('Project.urls')),
]

# Media serving
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
else:
    urlpatterns += [
        re_path(r'^media/(?P<path>.*)$', serve, {'document_root': settings.MEDIA_ROOT}),
    ]
