from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView
from . import views
from .core_views import CurrenciesAPIView

app_name = 'mobile_api'

router = DefaultRouter()
router.register(r'stores', views.SupplierViewSet, basename='supplier')
router.register(r'categories', views.CategoryViewSet, basename='category')
router.register(r'products', views.ProductViewSet, basename='product')
router.register(r'carts', views.CartViewSet, basename='cart')
router.register(r'orders', views.OrderViewSet, basename='order')

urlpatterns = [
    # Auth endpoints
    path('auth/login/', views.LoginAPIView.as_view(), name='login'),
    path('auth/signup/', views.SignupAPIView.as_view(), name='signup'),
    path('auth/unified-login/', views.UnifiedAuthAPIView.as_view(), name='unified_login'),
    path('auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),

    # Core & Buyer endpoints
    path('home/', views.HomeAPIView.as_view(), name='home'),
    path('stores/<str:store_id>/profile/', views.StoreProfileAPIView.as_view(), name='store_profile'),
    path('', include(router.urls)),

    # Merchant management endpoints
    path('merchant/dashboard/', views.MerchantDashboardAPIView.as_view(), name='merchant_dashboard'),
    path('merchant/switch/', views.MerchantSwitchAPIView.as_view(), name='merchant_switch'),
    path('merchant/orders/', views.MerchantOrdersAPIView.as_view(), name='merchant_orders'),
    path('merchant/orders/<int:order_id>/', views.MerchantOrderDetailAPIView.as_view(), name='merchant_order_detail'),
    path('merchant/products/', views.MerchantProductsAPIView.as_view(), name='merchant_products'),
    path('merchant/offers/', views.MerchantOffersAPIView.as_view(), name='merchant_offers'),
    path('merchant/product-categories/', views.MerchantProductCategoriesAPIView.as_view(), name='merchant_product_categories'),
    path('merchant/profile/', views.MerchantProfileAPIView.as_view(), name='merchant_profile'),
    path('merchant/branding/', views.MerchantBrandingAPIView.as_view(), name='merchant_branding'),
    path('merchant/agree-terms/', views.MerchantAgreeTermsAPIView.as_view(), name='merchant_agree_terms'),
    
    # Driver management endpoints
    path('driver/dashboard/', views.DriverDashboardAPIView.as_view(), name='driver_dashboard'),
    path('driver/orders/<int:order_id>/next-step/', views.DriverUpdateStatusAPIView.as_view(), name='driver_order_next_step'),
    path('driver/location/update/', views.DriverLocationUpdateAPIView.as_view(), name='driver_location_update'),
    
    # Core/Global data
    path('core/currencies/', CurrenciesAPIView.as_view(), name='currencies'),
]
