





from django.urls import path
from core.views import ConvertCartToOrder
from core.views.CartView import DecreaseQuantityView, IncreaseQuantityView, RemoveItemView
from core.views.CartView import  CartView, add_to_cart,sub_to_cart
from core.views.OrderDetailView import order_detail_view
from core.views.OrderListView import OrderListView
from core.views.PaymentDetailView import PaymentDetailView
from core.views.ProductDetailView import ProductDetailView
from core.views.ProductListView import product_list
from core.views.ConvertCartToOrder import checkout_select_address_or_custom_address
from core.views.SuppliersListView import SuppliersListView

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

    path('my-orders/', OrderListView.as_view(), name='my_orders'),
    path('order/<int:pk>/', order_detail_view, name='order_detail'),


    path('payments/<int:pk>/', PaymentDetailView.as_view(), name='payment-detail'),

    path('checkout_select_address_or_custom_address/<int:supplier_id>/', ConvertCartToOrder.checkout_select_address_or_custom_address, name='checkout_select_address_or_custom_address'),
    path('existing_address/<int:supplier_id>/', ConvertCartToOrder.existing_address, name='existing_address'),


]

