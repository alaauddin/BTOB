from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    LoginAPIView, SignupAPIView, UnifiedAuthAPIView,
    SupplierViewSet, ProductViewSet, CartViewSet, OrderViewSet,
    CategoryViewSet, HomeAPIView, StoreProfileAPIView
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
    
    # Merchant endpoints
    
    # Supplier endpoints
]
