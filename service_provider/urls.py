


from service_provider.Views.read.dashboard import  supplier_dashboard, update_supplier_profile
from service_provider.Views.read.list_products import list_products
from django.urls import path


urlpatterns = [
    path('supplier/dashboard/', supplier_dashboard, name='supplier_dashboard'),
    path('supplier/update-profile/', update_supplier_profile, name='update_supplier_profile'),
    path('list_products/', list_products, name='list_products'),
    
    
]