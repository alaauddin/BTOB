from django.contrib import admin
from django.urls import include, path
from django.conf import settings
from django.conf.urls.static import static
from core.views.ProductListView import product_list
from core.views.ProductDetailView import product_detail
from core.views.category_views import product_list_category, product_list_subcategory
from core.views.MyMerchant import my_merchant

# Tenant URLs - These are accessed via store.domain.com/
# No store_id needed in the path as it's derived from the domain (tenant)
urlpatterns = [
    path('admin/', admin.site.urls),
    
    # Storefront (Root)
    path('', product_list, name='product-list-home'),
    path('products/', product_list, name='product-list'), # Alias
    path('products/category/<int:category_id>/', product_list_category, name='product_list_category'),
    path('products/category/subcategory/<int:subcategory_id>/', product_list_subcategory, name='product_list_subcategory'),
    path('details/<int:pk>/', product_detail, name='product_detail'),

    # Merchant Dashboard (Tenant Context)
    path('my-merchant/', my_merchant, name='my_merchant'),
    
    # Common includes
    path('accounts/', include('allauth.urls')),
    # Add other apps as needed
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT) + static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)