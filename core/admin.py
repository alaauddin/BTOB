from django.contrib import admin
from .models import *
# Register your models here.
admin.site.register(Category)
admin.site.register(ProductCategory)
admin.site.register(Product)
admin.site.register(Cart)
admin.site.register(CartItem)
admin.site.register(Order)
admin.site.register(OrderItem)
admin.site.register(Payment)
admin.site.register(ShippingAddress)
admin.site.register(Address)
admin.site.register(Review)
admin.site.register(Supplier)
admin.site.register(SupplierCategory)
admin.site.register(ProductOffer)
admin.site.register(SuppierAds)
