from django.contrib import admin
from .models import *
import json
# Register your models here.
admin.site.register(Category)
admin.site.register(ProductCategory)
admin.site.register(Cart)
admin.site.register(CartItem)
admin.site.register(Order)
admin.site.register(OrderItem)
admin.site.register(Payment)
admin.site.register(ShippingAddress)
admin.site.register(Address)
admin.site.register(Review)
admin.site.register(OrderNote)

@admin.register(BusinessRequest)
class BusinessRequestAdmin(admin.ModelAdmin):
    list_display = ('name', 'owner_name', 'phone', 'business_type', 'created_at', 'is_processed')
    list_filter = ('is_processed', 'business_type', 'created_at')
    search_fields = ('name', 'owner_name', 'phone', 'email')
    readonly_fields = ('created_at',)
    list_editable = ('is_processed',)

class ProductImageInline(admin.TabularInline):
    model = ProductImage
    extra = 1

@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ('name', 'supplier', 'category', 'price', 'stock', 'is_new', 'views_count')
    list_filter = ('supplier', 'category', 'is_new')
    search_fields = ('name', 'description')
    inlines = [ProductImageInline]
    
    fields = ('supplier', 'category', 'name', 'description', 'price', 'stock', 'image', 'video', 'is_new', 'is_active')


class OrderStatusAdmin(admin.ModelAdmin):
    list_display = ('name', 'slug', 'is_terminal')
    prepopulated_fields = {'slug': ('name',)}

class WorkflowStepInline(admin.TabularInline):
    model = WorkflowStep
    fields = ('status', 'priority', 'requires_payment', 'decrease_stock')
    extra = 1

class OrderWorkflowAdmin(admin.ModelAdmin):
    list_display = ('name', 'is_default')
    inlines = [WorkflowStepInline]

admin.site.register(OrderStatus, OrderStatusAdmin)
admin.site.register(OrderWorkflow, OrderWorkflowAdmin)
admin.site.register(WorkflowStep)
from django.forms import widgets

from django.urls import reverse
from django.utils.html import format_html, mark_safe

class SupplierAdmin(admin.ModelAdmin):
    list_display = ('name', 'city', 'country', 'primary_color', 'views_count', 'is_active')
    search_fields = ('name', 'city')
    
    def workflow_steps_list(self, obj):
        if not obj.workflow:
            return format_html('<span style="color: #94a3b8;">{}</span>', 'لا يوجد نظام سير عمل مرتبط لهذا المورد.')
        
        steps = obj.workflow.steps.all().select_related('status')
        if not steps.exists():
            add_url = reverse('admin:core_workflowstep_add') + f'?workflow={obj.workflow.id}'
            return format_html(
                '<div style="background:#fefce8; padding:15px; border-radius:12px; border:1px solid #fef08a;">'
                '<p style="color:#854d0e; margin-bottom:10px;">{}</p>'
                '<a href="{}" class="addlink">{}</a></div>',
                'لا توجد خطوات حالياً لهذا النظام.',
                add_url,
                'إضافة أول خطوة'
            )

        html = '<div style="background: white; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">'
        html += '<table style="width:100%; border-collapse: collapse; text-align: right;">'
        html += '<thead style="background: #f8fafc; border-bottom: 2px solid #e2e8f0;">'
        html += '<tr><th style="padding:12px; font-weight:600;">الحالة</th><th style="padding:12px; font-weight:600;">الأولوية</th><th style="padding:12px; font-weight:600;">يتطلب سداد</th><th style="padding:12px; font-weight:600;">تقليل المخزون</th><th style="padding:12px; font-weight:600;">الإجراءات</th></tr></thead><tbody>'
        
        for step in steps:
            edit_url = reverse('admin:core_workflowstep_change', args=[step.id])
            req_payment_icon = '✅' if step.requires_payment else '❌'
            decrease_stock_icon = '✅' if step.decrease_stock else '❌'
            html += f'<tr style="border-bottom: 1px solid #f1f5f9;">'
            html += f'<td style="padding:12px;"><span style="background: #e0e7ff; color: #4338ca; padding: 4px 10px; border-radius: 20px; font-size: 0.85rem; font-weight: 500;">{step.status.name}</span></td>'
            html += f'<td style="padding:12px; font-weight: 600; color: #64748b;">{step.priority}</td>'
            html += f'<td style="padding:12px; text-align:center;">{req_payment_icon}</td>'
            html += f'<td style="padding:12px; text-align:center;">{decrease_stock_icon}</td>'
            html += f'<td style="padding:12px;"><a href="{edit_url}" class="changelink">تعديل</a></td></tr>'
        
        add_url = reverse('admin:core_workflowstep_add') + f'?workflow={obj.workflow.id}'
        html += f'</tbody></table>'
        html += f'<div style="background: #f8fafc; padding: 12px; border-top: 1px solid #e2e8f0;">'
        html += f'<a href="{add_url}" class="addlink" style="font-weight: 600; color: #4f46e5;">إضافة خطوة جديدة لهذا النظام</a>'
        html += '</div></div>'
        
        return mark_safe(html)
    
    workflow_steps_list.short_description = 'إعدادات خطوات سير العمل'

    fieldsets = (
        ('المعلومات الأساسية', {
            'fields': ('user', 'name', 'is_active', 'phone', 'category', 'currency', 'return_policy', 'delivery_fee_ratio', 'enable_delivery_fees', 'show_order_amounts','show_platform_ads','store_id'),
            'description': 'أضف المعلومات الأساسية للمورد هنا.'
        }),
        ('المكان والجغرافيا', {
            'fields': ('address', 'city', 'country', 'latitude', 'longitude', 'map_picker'),
        }),
        ('الهوية البصرية', {
            'fields': ('profile_picture', 'panal_picture'),
            'description': 'قم برفع الصور الخاصة بالهوية البصرية (الشعار وصورة البانر).'
        }),
        ('نظام سير العمل (Pipeline)', {
            'fields': ('workflow', 'workflow_steps_list'),
            'description': 'إدارة تسلسل استلام وتوصيل الطلبات لهذا المورد.'
        }),
        ('تخصيص الألوان', {
            'fields': ('primary_color', 'secondary_color', 'navbar_color', 'footer_color', 'text_color', 'accent_color'),
            'description': 'استخدم منتقي الألوان لتحديد ألوان متناسقة لمتجرك.'
        }),
        ('اعدادات الفئات', {
            'fields': ('can_add_categories', 'can_add_product_categories','show_system_logo', 'show_out_of_stock')
        }),
    )

    readonly_fields = ('workflow_steps_list', 'map_picker')

    def map_picker(self, obj):
        lat = obj.latitude or 15.3694  # Default to Sana'a
        lng = obj.longitude or 44.1910
        
        return format_html(
            '''
            <div id="admin-map" style="height: 400px; width: 100%; border-radius: 12px; margin-bottom: 10px; border: 1px solid #ccc;"></div>
            <p class="help">انقر على الخريطة لتحديد موقع المورد بدقة.</p>
            <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
            <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
            <script>
                document.addEventListener('DOMContentLoaded', function() {{
                    const latInput = document.getElementById('id_latitude');
                    const lngInput = document.getElementById('id_longitude');
                    
                    const initialLat = parseFloat(latInput.value) || {lat};
                    const initialLng = parseFloat(lngInput.value) || {lng};
                    
                    const map = L.map('admin-map').setView([initialLat, initialLng], 13);
                    
                    L.tileLayer('https://{{s}}.tile.openstreetmap.org/{{z}}/{{x}}/{{y}}.png', {{
                        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    }}).addTo(map);
                    
                    let marker = L.marker([initialLat, initialLng], {{draggable: true}}).addTo(map);
                    
                    function updateInputs(lat, lng) {{
                        latInput.value = lat.toFixed(6);
                        lngInput.value = lng.toFixed(6);
                    }}
                    
                    map.on('click', function(e) {{
                        const {{lat, lng}} = e.latlng;
                        marker.setLatLng([lat, lng]);
                        updateInputs(lat, lng);
                    }});
                    
                    marker.on('dragend', function(e) {{
                        const {{lat, lng}} = marker.getLatLng();
                        updateInputs(lat, lng);
                    }});
                }});
            </script>
            ''',
            lat=lat, lng=lng
        )
    map_picker.short_description = 'تحديد الموقع على الخريطة'

    def formfield_for_dbfield(self, db_field, **kwargs):
        if db_field.name in ['primary_color', 'secondary_color', 'navbar_color', 'footer_color', 'text_color', 'accent_color']:
            kwargs['widget'] = widgets.Input(attrs={'type': 'color', 'style': 'width: 100px; height: 40px; border: none; cursor: pointer;'})
        return super().formfield_for_dbfield(db_field, **kwargs)

admin.site.register(Supplier, SupplierAdmin)
admin.site.register(SupplierCategory)
admin.site.register(ProductOffer)
admin.site.register(SupplierAds)
admin.site.register(Currency)
admin.site.register(PlatformOfferAd)
@admin.register(SupplierAdPlatfrom)
class SupplierAdPlatfromAdmin(admin.ModelAdmin):
    list_display = ('title', 'supplier', 'start_datetime', 'end_datetime', 'is_active', 'approved')
    list_filter = ('is_active', 'approved', 'start_datetime')
    search_fields = ('title', 'supplier__name')
    
    from .widgets import ImageCroppingWidget
    from .models import SupplierAdPlatfrom
    from django.db import models
    
    formfield_overrides = {
        models.ImageField: {'widget': ImageCroppingWidget},
    }

    def get_form(self, request, obj=None, **kwargs):
        form = super().get_form(request, obj, **kwargs)
        # Desktop Image: 3.8 ratio
        form.base_fields['image'].widget.attrs.update({'data_aspect_ratio': '3.8'})
        # Mobile Image: 1:1 ratio (1.0)
        form.base_fields['mobile_image'].widget.attrs.update({'data_aspect_ratio': '1.0'})
        return form

@admin.register(SystemSettings)
class SystemSettingsAdmin(admin.ModelAdmin):
    list_display = ('site_name', 'company_email', 'show_download_app')
    fieldsets = (
        ('المعلومات العامة', {
            'fields': ('site_name', 'description', 'logo','laoder_image')
        }),
        ('معلومات التواصل', {
            'fields': ('company_email', 'customer_service_number', 'company_landline')
        }),
        ('الروابط الاجتماعية', {
            'fields': ('twitter_url', 'instagram_url', 'whatsapp_number')
        }),
        ('التطبيقات', {
            'fields': ('show_download_app', 'app_store_link', 'google_play_link')
        }),
        ('واتساب', {
            'fields': ('whatsapp_api_url', 'whatsapp_api_key')
        }),
        ('إعدادات SEO', {
            'fields': ('seo_title', 'seo_description', 'seo_keywords'),
            'description': 'تحكم في كيفية ظهور موقعك في نتائج محركات البحث مثل جوجل.'
        }),
    )
    
    def has_add_permission(self, request):
        # Disable add button if an instance already exists
        if self.model.objects.exists():
            return False
        return super().has_add_permission(request)
