





from django.urls import path
from core.views import ConvertCartToOrder
from core.views.CartView import DecreaseQuantityView, IncreaseQuantityView, RemoveItemView
from core.views.CartView import  CartView, add_to_cart,sub_to_cart
from core.views.OrderDetailView import order_detail_view
from core.views.OrderListView import order_list_view
from core.views.PaymentDetailView import PaymentDetailView
from core.views.ProductDetailView import ProductDetailView
from core.views.ProductListView import product_list
from core.views.ConvertCartToOrder import checkout_select_address_or_custom_address
from core.views.SuppliersListView import SuppliersListView
from core.views.add_to_wish_list import toggle_wishlist, get_wishlist_status
from core.views.MyMerchant import my_merchant
from core.views.add_product import add_product
from core.views.edit_product import edit_product
from core.views.add_product_offer import add_product_offer
from core.views.edit_product_offer import edit_product_offer
from core.views.add_ads import add_ads
from core.views.edit_ads import edit_ads

urlpatterns = [
    # path('products/', ProductListView.as_view(), name='product-list'),
    path('products/<int:supplier_id>/', product_list, name='product-list'),
    path('products/category/<int:category_id>/<int:supplier_id>/', product_list, name='product_list_category'),
    path('products/category/product_list_subcategory/<int:subcategory_id>/<int:supplier_id>/', product_list, name='product_list_subcategory'),
    path('products/details/<int:pk>/', ProductDetailView.as_view(), name='product_detail'),
    path('', SuppliersListView, name='suppliers_list'),






    path('cart/<int:supplier_id>/', CartView.as_view(), name='cart-detail'),
    path('add_to_cart/<int:product_id>/<int:supplier_id>/', add_to_cart , name='add_to_cart'),
    path('sub_to_cart/<int:product_id>/<int:supplier_id>/', sub_to_cart , name='sub_to_cart'),
    
    path('increase_quantity/<int:item_id>/<int:supplier_id>/', IncreaseQuantityView.as_view(), name='increase_quantity'),
    path('decrease_quantity/<int:item_id>/<int:supplier_id>/', DecreaseQuantityView.as_view(), name='decrease_quantity'),
    path('remove_item/<int:item_id>/<int:supplier_id>/', RemoveItemView.as_view(), name='remove_item'),

    path('my-orders/', order_list_view, name='my_orders'),
    path('order/<int:pk>/', order_detail_view, name='order_detail'),


    path('payments/<int:pk>/', PaymentDetailView.as_view(), name='payment-detail'),

    path('checkout_select_address_or_custom_address/<int:supplier_id>/', ConvertCartToOrder.checkout_select_address_or_custom_address, name='checkout_select_address_or_custom_address'),
    path('existing_address/<int:supplier_id>/', ConvertCartToOrder.existing_address, name='existing_address'),

    # Wishlist URLs
    path('wishlist/toggle/<int:product_id>/', toggle_wishlist, name='toggle_wishlist'),
    path('wishlist/status/<int:product_id>/', get_wishlist_status, name='wishlist_status'),
    
    # Merchant Dashboard
    path('my-merchant/', my_merchant, name='my_merchant'),
    path('add-product/', add_product, name='add_product'),
    path('edit-product/<int:product_id>/', edit_product, name='edit_product'),
    path('add-offer/', add_product_offer, name='add_product_offer'),
    path('edit-offer/<int:offer_id>/', edit_product_offer, name='edit_product_offer'),
    path('add-ads/', add_ads, name='add_ads'),
    path('edit-ads/<int:ad_id>/', edit_ads, name='edit_ads'),

]

