





from django.urls import path
from core.views import ConvertCartToOrder
from core.views.CartView import DecreaseQuantityView, IncreaseQuantityView, RemoveItemView
from core.views.CartView import  CartView, add_to_cart,sub_to_cart, get_cart_status
from core.views.OrderDetailView import order_detail_view
from core.views.OrderListView import order_list_view
from core.views.PaymentDetailView import PaymentDetailView
from core.views.ProductDetailView import  product_detail
from core.views.AddReview import AddReviewView
from core.views.ProductListView import product_list
from core.views.ConvertCartToOrder import checkout_select_address_or_custom_address
from core.views.SuppliersListView import SuppliersListView
from core.views.add_to_wish_list import toggle_wishlist, get_wishlist_status
from core.views.MyMerchant import my_merchant, update_merchant_settings, merchant_products, merchant_marketing, merchant_analytics, merchant_tutorial, quick_update_stock
from core.views.agree_to_terms import agree_to_terms
from core.views.add_product import add_product
from core.views.edit_product import edit_product
from core.views.add_product_offer import add_product_offer
from core.views.edit_product_offer import edit_product_offer
from core.views.add_ads import add_ads
from core.views.edit_ads import edit_ads
from core.views.MerchantOrderManagement import merchant_orders, merchant_order_detail, update_order_status, add_order_note, add_payment_reference, merchant_order_quick_view, update_order_status_ajax
from core.views.category_views import add_category_ajax
from core.views.delete_product import toggle_product_status
from core.views.toggle_ad_status import toggle_ad_status
from core.views.request_promotion import request_promotion
from core.views.manage_platform_ads import add_platform_ad, edit_platform_ad, toggle_platform_ad_status
from core.views.join_business import join_business, verify_signup_otp
from core.views.merchant_auth import MerchantLoginView
from core.views.privacy_policy import privacy_policy
from core.views.profile import profile_view, address_list_view, set_current_address

urlpatterns = [
    # Static Pages
    path('privacy-policy/', privacy_policy, name='privacy_policy'),
    path('profile/', profile_view, name='user_profile'),
    path('profile/addresses/', address_list_view, name='address_list'),
    path('profile/addresses/set/<int:pk>/', set_current_address, name='set_current_address'),

    # path('products/', ProductListView.as_view(), name='product-list'),
    path('/<str:store_id>/', product_list, name='product-list'),
    path('products/category/<int:category_id>/<str:store_id>/', product_list, name='product_list_category'),
    path('products/category/product_list_subcategory/<int:subcategory_id>/<str:store_id>/', product_list, name='product_list_subcategory'),
    path('<str:store_id>/details/<int:pk>/', product_detail, name='product_detail'),
    path('', SuppliersListView, name='suppliers_list'),
    path('join-business/', join_business, name='join_business'),
    path('verify-signup-otp/', verify_signup_otp, name='verify_signup_otp'),
    path('merchant/login/', MerchantLoginView.as_view(), name='merchant_login'),






    path('cart/<str:store_id>/', CartView.as_view(), name='cart-detail'),
    path('add_to_cart/<int:product_id>/<str:store_id>/', add_to_cart , name='add_to_cart'),
    path('add_review/<int:product_id>/<str:store_id>/', AddReviewView.as_view(), name='add_review'),
    path('sub_to_cart/<int:product_id>/<str:store_id>/', sub_to_cart , name='sub_to_cart'),
    path('cart/status/<str:store_id>/', get_cart_status, name='get_cart_status'),
    
    path('increase_quantity/<int:item_id>/<str:store_id>/', IncreaseQuantityView.as_view(), name='increase_quantity'),
    path('decrease_quantity/<int:item_id>/<str:store_id>/', DecreaseQuantityView.as_view(), name='decrease_quantity'),
    path('remove_item/<int:item_id>/<str:store_id>/', RemoveItemView.as_view(), name='remove_item'),

    path('my-orders/', order_list_view, name='my_orders'),
    path('order/<int:pk>/', order_detail_view, name='order_detail'),


    path('payments/<int:pk>/', PaymentDetailView.as_view(), name='payment-detail'),
    path('checkout_select_address_or_custom_address/<str:store_id>/', ConvertCartToOrder.checkout_select_address_or_custom_address, name='checkout_select_address_or_custom_address'),
    path('existing_address/<str:store_id>/', ConvertCartToOrder.existing_address, name='existing_address'),

    # Wishlist URLs
    path('wishlist/toggle/<int:product_id>/', toggle_wishlist, name='toggle_wishlist'),
    path('wishlist/status/<int:product_id>/', get_wishlist_status, name='wishlist_status'),
    
    # Merchant Dashboard
    path('my-merchant/', my_merchant, name='my_merchant'),
    path('merchant-products/', merchant_products, name='merchant_products'),
    path('merchant-marketing/', merchant_marketing, name='merchant_marketing'),
    path('merchant-analytics/', merchant_analytics, name='merchant_analytics'),
    path('merchant-tutorial/', merchant_tutorial, name='merchant_tutorial'),
    path('update-merchant-settings/', update_merchant_settings, name='update_merchant_settings'),
    path('agree-to-terms/', agree_to_terms, name='agree_to_terms'),
    path('quick-update-stock/<int:product_id>/', quick_update_stock, name='quick_update_stock'),
    path('add-product/', add_product, name='add_product'),
    path('edit-product/<int:product_id>/', edit_product, name='edit_product'),
    path('add-offer/', add_product_offer, name='add_product_offer'),
    path('edit-offer/<int:offer_id>/', edit_product_offer, name='edit_product_offer'),
    path('add-ad/', add_ads, name='add_ads'),
    path('edit-ad/<int:ad_id>/', edit_ads, name='edit_ads'),
    path('toggle-product-status/<int:product_id>/', toggle_product_status, name='toggle_product_status'),
    path('toggle-ad-status/<int:ad_id>/', toggle_ad_status, name='toggle_ad_status'),
    path('request-promotion/', request_promotion, name='request_promotion'),
    path('add-category-ajax/', add_category_ajax, name='add_category_ajax'),
    
    # Platform Ads Management
    path('add-platform-ad/', add_platform_ad, name='add_platform_ad'),
    path('edit-platform-ad/<int:ad_id>/', edit_platform_ad, name='edit_platform_ad'),
    path('toggle-platform-ad-status/<int:ad_id>/', toggle_platform_ad_status, name='toggle_platform_ad_status'),
    
    # Merchant Order Management
    path('merchant-orders/', merchant_orders, name='merchant_orders'),
    path('merchant-order/<int:order_id>/', merchant_order_detail, name='merchant_order_detail'),
    path('update-order-status/<int:order_id>/', update_order_status, name='update_order_status'),
    path('add-order-note/<int:order_id>/', add_order_note, name='add_order_note'),
    path('add-payment-reference/<int:order_id>/', add_payment_reference, name='add_payment_reference'),
    path('merchant-order-quick-view/<int:order_id>/', merchant_order_quick_view, name='merchant_order_quick_view'),
    path('update-order-status-ajax/<int:order_id>/', update_order_status_ajax, name='update_order_status_ajax'),

]

