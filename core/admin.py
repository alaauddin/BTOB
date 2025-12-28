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
from django.forms import widgets

class SupplierAdmin(admin.ModelAdmin):
    list_display = ('name', 'city', 'country', 'primary_color')
    search_fields = ('name', 'city')
    
    fieldsets = (
        ('المعلومات الأساسية', {
            'fields': ('user', 'name', 'phone', 'category', 'currency'),
            'description': 'أضف المعلومات الأساسية للمورد هنا.'
        }),
        ('المكان والجغرافيا', {
            'fields': ('address', 'city', 'country'),
        }),
        ('الهوية البصرية', {
            'fields': ('profile_picture', 'panal_picture'),
            'description': 'قم برفع الصور الخاصة بالهوية البصرية (الشعار وصورة البانر).'
        }),
        ('تخصيص الألوان', {
            'fields': ('primary_color', 'secondary_color', 'navbar_color', 'footer_color', 'text_color', 'accent_color'),
            'description': 'استخدم منتقي الألوان لتحديد ألوان متناسقة لمتجرك. تجنب استخدام التدرجات اللونية (Gradients) للحصول على مظهر عصري ومسطح.'
        }),
    )

    def formfield_for_dbfield(self, db_field, **kwargs):
        if db_field.name in ['primary_color', 'secondary_color', 'navbar_color', 'footer_color', 'text_color', 'accent_color']:
            kwargs['widget'] = widgets.Input(attrs={'type': 'color', 'style': 'width: 100px; height: 40px; border: none; cursor: pointer;'})
        return super().formfield_for_dbfield(db_field, **kwargs)

admin.site.register(Supplier, SupplierAdmin)
admin.site.register(SupplierCategory)
admin.site.register(ProductOffer)
admin.site.register(SuppierAds)
