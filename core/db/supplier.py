"""Supplier-related models: SupplierCategory, Currency, Supplier, SupplierAdPlatfrom."""

import re

from django.core.exceptions import ValidationError
from django.core.validators import RegexValidator
from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone

from core.db.utils import upload_to_path
from core.db.constants import CITY_CHO, COUNTRY_CHO
from core.db.workflow import OrderWorkflow

# Subdomains that cannot be claimed by suppliers
RESERVED_SUBDOMAINS = frozenset({
    'www', 'admin', 'api', 'support', 'mail', 'ftp',
    'static', 'media', 'dashboard', 'help', 'docs',
    'billing', 'status', 'app', 'dev', 'staging',
})


class SupplierCategory(models.Model):
    image = models.ImageField(upload_to=upload_to_path, blank=True, null=True)
    name = models.CharField(max_length=100)
    producing_family = models.BooleanField(default=False)

    class Meta:
        app_label = 'core'

    def __str__(self):
        return self.name


class Currency(models.Model):
    name = models.CharField(max_length=100, verbose_name="اسم العملة")
    code = models.CharField(max_length=10, unique=True, verbose_name="رمز العملة (ISO)")
    symbol = models.CharField(max_length=10, verbose_name="الرمز (الشعار)")

    class Meta:
        app_label = 'core'

    def __str__(self):
        return self.symbol


class Supplier(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='supplier')
    name = models.CharField(max_length=100)
    store_id = models.SlugField(max_length=100, unique=True, null=True, blank=True)
    phone = models.CharField(max_length=15)
    secondary_phone = models.CharField(max_length=15, blank=True, null=True, verbose_name="رقم هاتف إضافي")
    address = models.CharField(max_length=255)
    city = models.CharField(max_length=100, choices=CITY_CHO)
    country = models.CharField(max_length=100, choices=COUNTRY_CHO)
    category = models.ManyToManyField(SupplierCategory)
    primary_color = models.CharField(max_length=7, default='#F58231')
    secondary_color = models.CharField(max_length=7, default='#ffffff')
    navbar_color = models.CharField(max_length=7, default='#F58231')
    footer_color = models.CharField(max_length=7, default='#2B6CB0')
    text_color = models.CharField(max_length=7, default='#4A5568')
    accent_color = models.CharField(max_length=7, default='#00FFFF')
    currency = models.ForeignKey(Currency, on_delete=models.SET_NULL, null=True, blank=True)
    profile_picture = models.ImageField(upload_to=upload_to_path, blank=True, null=True)
    panal_picture = models.ImageField(upload_to=upload_to_path, blank=True, null=True)
    workflow = models.ForeignKey(OrderWorkflow, on_delete=models.SET_NULL, null=True, blank=True)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    delivery_fee_ratio = models.DecimalField(max_digits=10, decimal_places=2, default=0.00, verbose_name="نسبة رسوم التوصيل لكل كم")
    enable_delivery_fees = models.BooleanField(default=False, verbose_name="تفعيل رسوم التوصيل")
    show_order_amounts = models.BooleanField(default=True, verbose_name="عرض مبالغ الطلبات")
    show_platform_ads = models.BooleanField(default=True, verbose_name="عرض إعلانات المنصة")
    priority = models.IntegerField(default=0, verbose_name="الأولوية (الأعلى يظهر أولاً)")
    views_count = models.PositiveIntegerField(default=0, verbose_name="عدد المشاهدات")
    can_add_categories = models.BooleanField(default=False, verbose_name="إضافة فئات")
    can_add_product_categories = models.BooleanField(default=False, verbose_name="إضافة فئات المنتجات")
    can_add_products = models.BooleanField(default=False, verbose_name="إضافة منتجات")
    show_system_logo = models.BooleanField(default=True, verbose_name="عرض شعار المنصة في الشريط العلوي")
    show_out_of_stock = models.BooleanField(default=True, verbose_name="عرض المنتجات غير المتوفرة")
    agreed_to_terms = models.BooleanField(default=False, verbose_name="الموافقة على الشروط والأحكام")
    terms_agreed_at = models.DateTimeField(null=True, blank=True, verbose_name="تاريخ الموافقة على الشروط")
    return_policy = models.TextField(blank=True, null=True, verbose_name="سياسة الاستبدال والاسترجاع")
    
    # Custom Footer & Social Fields
    footer_description = models.TextField(blank=True, null=True, verbose_name="وصف التذييل (Footer)")
    facebook_url = models.URLField(blank=True, null=True, verbose_name="رابط فيسبوك")
    instagram_url = models.URLField(blank=True, null=True, verbose_name="رابط انستقرام")
    twitter_url = models.URLField(blank=True, null=True, verbose_name="رابط تويتر")
    tiktok_url = models.URLField(blank=True, null=True, verbose_name="رابط تيك توك")

    is_active = models.BooleanField(default=True, verbose_name="نشط")
    has_seen_products_tour = models.BooleanField(default=False, verbose_name="شاهد جولة المنتجات")
    managing_users = models.ManyToManyField(User, related_name='managed_suppliers', blank=True, verbose_name="المستخدمين المدراء")
    subdomain = models.CharField(
        max_length=63,
        unique=True,
        db_index=True,
        null=True,
        blank=True,
        verbose_name="النطاق الفرعي",
        help_text="مثال: 'mystore' → mystore.rawaaj.com",
        validators=[
            RegexValidator(
                regex=r'^[a-z0-9]([a-z0-9-]*[a-z0-9])?$',
                message="يجب أن يحتوي النطاق الفرعي على أحرف صغيرة وأرقام وشُرَط فقط، ولا يبدأ أو ينتهي بشرطة.",
            ),
        ],
    )

    class Meta:
        app_label = 'core'

    def clean(self):
        """Validate the subdomain against reserved words."""
        super().clean()
        if self.subdomain:
            self.subdomain = self.subdomain.lower().strip()
            if self.subdomain in RESERVED_SUBDOMAINS:
                raise ValidationError(
                    {'subdomain': f"'{self.subdomain}' نطاق فرعي محجوز ولا يمكن استخدامه."}
                )

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if self.pk:
            old_instance = Supplier.objects.filter(pk=self.pk).first()
            if old_instance and old_instance.is_active and not self.is_active:
                # Deactivating supplier: deactivate ads
                self.supplier_ads.all().update(is_active=False)
                from core.db.ads import PlatformOfferAd
                PlatformOfferAd.objects.filter(product__supplier=self).update(is_approved=False)
        super().save(*args, **kwargs)

    def get_total_sales_for_current_month(self):
        from core.db.order import Order
        orders = Order.objects.filter(
            order_items__product__supplier=self,
            pipeline_status__slug='confirmed',
            created_at__month=timezone.now().month
        ).distinct()
        return sum([order.get_total_amount() for order in orders])

    def get_total_sales_count(self):
        from core.db.order import Order
        return Order.objects.filter(
            order_items__product__supplier=self,
            pipeline_status__slug='confirmed'
        ).distinct().count()

    def get_average_rating(self):
        from core.db.review import Review
        from django.db.models import Avg
        avg_rating = Review.objects.filter(product__supplier=self).aggregate(Avg('rating'))['rating__avg']
        return round(float(avg_rating), 1) if avg_rating is not None else 0.0


class SupplierAdPlatfrom(models.Model):
    supplier = models.ForeignKey(Supplier, on_delete=models.CASCADE, null=True, blank=True)
    title = models.CharField(max_length=200, null=True, blank=True, verbose_name="العنوان")
    tag_text = models.CharField(max_length=50, null=True, blank=True, verbose_name="نص الشارة")
    image = models.ImageField(upload_to=upload_to_path, verbose_name="صورة سطح المكتب (Desktop)")
    mobile_image = models.ImageField(upload_to=upload_to_path, null=True, blank=True, verbose_name="صورة الجوال (Mobile)")
    link = models.URLField(null=True, blank=True)
    start_datetime = models.DateTimeField(null=True, blank=True, verbose_name="تاريخ ووقت البدء")
    end_datetime = models.DateTimeField(null=True, blank=True, verbose_name="تاريخ ووقت الانتهاء")
    is_active = models.BooleanField(default=True)
    approved = models.BooleanField(default=False)

    class Meta:
        app_label = 'core'

    def __str__(self):
        return self.title if self.title else (self.supplier.name if self.supplier else f"Platform Ad {self.id}")
