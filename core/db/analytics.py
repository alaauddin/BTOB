"""Analytics and tracking models."""

from django.db import models
from django.contrib.auth.models import User

from core.db.supplier import Supplier
from core.db.product import Product


class WebsiteStatistic(models.Model):
    """
    يسجل كل زيارة لصفحة في الموقع مع بيانات تحليلية مفصلة.
    Tracks every page visit with rich analytics data.
    """

    DEVICE_CHOICES = [
        ('mobile', 'جوال'),
        ('tablet', 'تابلت'),
        ('desktop', 'حاسوب'),
        ('bot', 'روبوت'),
        ('unknown', 'غير معروف'),
    ]

    PAGE_TYPE_CHOICES = [
        ('landing', 'الصفحة الرئيسية'),
        ('product_list', 'قائمة المنتجات'),
        ('product_detail', 'تفاصيل المنتج'),
        ('cart', 'سلة التسوق'),
        ('checkout', 'إتمام الشراء'),
        ('order_detail', 'تفاصيل الطلب'),
        ('join_business', 'انضمام تجاري'),
        ('profile', 'الملف الشخصي'),
        ('merchant_dashboard', 'لوحة التاجر'),
        ('other', 'أخرى'),
    ]

    # --- Visit Info ---
    url = models.URLField(max_length=2048, verbose_name="الرابط")
    page_type = models.CharField(
        max_length=30, choices=PAGE_TYPE_CHOICES, default='other',
        verbose_name="نوع الصفحة"
    )
    method = models.CharField(max_length=10, default='GET', verbose_name="نوع الطلب")

    # --- Visitor Info ---
    ip_address = models.GenericIPAddressField(
        null=True, blank=True, verbose_name="عنوان IP"
    )
    user_agent = models.TextField(blank=True, default='', verbose_name="وكيل المستخدم")
    device_type = models.CharField(
        max_length=10, choices=DEVICE_CHOICES, default='unknown',
        verbose_name="نوع الجهاز"
    )
    browser = models.CharField(
        max_length=100, blank=True, default='', verbose_name="المتصفح"
    )
    operating_system = models.CharField(
        max_length=100, blank=True, default='', verbose_name="نظام التشغيل"
    )

    # --- Referrer ---
    referrer = models.URLField(
        max_length=2048, blank=True, default='', verbose_name="المرجع (Referrer)"
    )

    # --- User & Session ---
    user = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='visit_statistics', verbose_name="المستخدم"
    )
    session_key = models.CharField(
        max_length=40, blank=True, default='', verbose_name="معرف الجلسة"
    )

    # --- Store Context ---
    supplier = models.ForeignKey(
        Supplier, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='visit_statistics', verbose_name="المتجر"
    )

    # --- Response ---
    response_status = models.PositiveSmallIntegerField(
        default=200, verbose_name="حالة الاستجابة"
    )

    # --- Timestamps ---
    visited_at = models.DateTimeField(auto_now_add=True, verbose_name="وقت الزيارة")

    class Meta:
        app_label = 'core'
        verbose_name = "إحصائية زيارة"
        verbose_name_plural = "إحصائيات الموقع"
        ordering = ['-visited_at']
        indexes = [
            models.Index(fields=['-visited_at']),
            models.Index(fields=['ip_address']),
            models.Index(fields=['page_type']),
            models.Index(fields=['device_type']),
            models.Index(fields=['supplier']),
            models.Index(fields=['user']),
        ]

    def __str__(self):
        """Return a human-readable representation of the visit record."""
        user_label = self.user.username if self.user else self.ip_address or 'مجهول'
        return f"{user_label} → {self.page_type} ({self.visited_at:%Y-%m-%d %H:%M})"


class WhatsAppInquiryClick(models.Model):
    """Tracks every click on the WhatsApp inquiry button on product detail pages."""

    product = models.ForeignKey(
        Product, on_delete=models.CASCADE,
        related_name='wa_inquiry_clicks', verbose_name="المنتج"
    )
    supplier = models.ForeignKey(
        Supplier, on_delete=models.CASCADE,
        related_name='wa_inquiry_clicks', verbose_name="المتجر"
    )
    user = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='wa_inquiry_clicks', verbose_name="المستخدم"
    )
    session_key = models.CharField(max_length=40, blank=True, default='', verbose_name="معرف الجلسة")
    clicked_at = models.DateTimeField(auto_now_add=True, verbose_name="وقت الضغط")

    class Meta:
        app_label = 'core'
        verbose_name = "نقرة استفسار واتساب"
        verbose_name_plural = "نقرات استفسار واتساب"
        ordering = ['-clicked_at']

    def __str__(self):
        user_label = self.user.username if self.user else 'زائر'
        return f"{user_label} → {self.product.name} ({self.clicked_at:%Y-%m-%d %H:%M})"
