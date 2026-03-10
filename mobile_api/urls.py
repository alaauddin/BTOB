from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    LoginAPIView, SignupAPIView, UnifiedAuthAPIView,
    SupplierViewSet, ProductViewSet, CartViewSet, OrderViewSet,
    CategoryViewSet, HomeAPIView, StoreProfileAPIView,
    # Merchant management
    MerchantDashboardAPIView, MerchantSwitchAPIView,
    MerchantOrdersAPIView, MerchantOrderDetailAPIView,
    MerchantProductsAPIView,
)

app_name = 'mobile_api'

router = DefaultRouter()
router.register(r'stores', SupplierViewSet, basename='supplier')
router.register(r'categories', CategoryViewSet, basename='category')
router.register(r'products', ProductViewSet, basename='product')
router.register(r'carts', CartViewSet, basename='cart')
router.register(r'orders', OrderViewSet, basename='order')

urlpatterns = [
    # Auth endpoints
    path('auth/login/', LoginAPIView.as_view(), name='login'),
    path('auth/signup/', SignupAPIView.as_view(), name='signup'),
    path('auth/unified-login/', UnifiedAuthAPIView.as_view(), name='unified_login'),
    path('auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),

    # Core & Buyer endpoints
    path('home/', HomeAPIView.as_view(), name='home'),
    path('stores/<str:store_id>/profile/', StoreProfileAPIView.as_view(), name='store_profile'),
    path('', include(router.urls)),

    # Merchant management endpoints
    path('merchant/dashboard/', MerchantDashboardAPIView.as_view(), name='merchant_dashboard'),
    path('merchant/switch/', MerchantSwitchAPIView.as_view(), name='merchant_switch'),
    path('merchant/orders/', MerchantOrdersAPIView.as_view(), name='merchant_orders'),
    path('merchant/orders/<int:order_id>/', MerchantOrderDetailAPIView.as_view(), name='merchant_order_detail'),
    path('merchant/products/', MerchantProductsAPIView.as_view(), name='merchant_products'),
]
