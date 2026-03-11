"""System settings model."""

from django.db import models

from core.db.utils import upload_to_path


class SystemSettings(models.Model):
    site_name = models.CharField(max_length=100, default="متجرك الإلكتروني", verbose_name="اسم الموقع")
    logo = models.ImageField(upload_to=upload_to_path, null=True, blank=True, verbose_name="الشعار")
    description = models.TextField(default="منصة متكاملة توفر لك تجربة تسوق فريدة ومميزة.", verbose_name="وصف الموقع")

    # Contact Info
    customer_service_number = models.CharField(max_length=20, default="+967 777 777 777", verbose_name="رقم خدمة العملاء (موبايل)")
    company_email = models.EmailField(default="support@store.com", verbose_name="البريد الإلكتروني للشركة")
    company_landline = models.CharField(max_length=20, null=True, blank=True, verbose_name="رقم الهاتف الأرضي")

    # Social Media
    twitter_url = models.URLField(blank=True, verbose_name="رابط تويتر")
    instagram_url = models.URLField(blank=True, verbose_name="رابط انستقرام")
    whatsapp_number = models.CharField(max_length=20, blank=True, verbose_name="رقم واتساب للدعم")

    # App Links
    show_download_app = models.BooleanField(default=True, verbose_name="عرض روابط تحميل التطبيق")
    app_store_link = models.URLField(blank=True, verbose_name="رابط App Store")
    google_play_link = models.URLField(blank=True, verbose_name="رابط Google Play")
    laoder_image = models.ImageField(upload_to=upload_to_path, null=True, blank=True, verbose_name="صورة التحميل")

    # SEO Settings
    seo_title = models.CharField(max_length=255, null=True, blank=True, verbose_name="العنوان لمحركات البحث (SEO Title)")
    seo_description = models.TextField(null=True, blank=True, verbose_name="الوصف لمحركات البحث (SEO Description)")
    seo_keywords = models.TextField(null=True, blank=True, verbose_name="الكلمات المفتاحية (SEO Keywords)")

    whatsapp_api_url = models.URLField(blank=True, verbose_name="رابط API واتساب")
    whatsapp_api_key = models.CharField(max_length=500, blank=True, verbose_name="الكود API واتساب")

    show_merchant_agreement = models.BooleanField(default=False, verbose_name="عرض اتفاقية التجار")

    # Analytics & Tracking
    meta_pixel_id = models.CharField(
        max_length=50, blank=True, default='',
        verbose_name="معرف Meta Pixel",
        help_text="أدخل معرف بكسل ميتا (مثال: 1413008573165397)"
    )

    class Meta:
        app_label = 'core'
        verbose_name = "إعدادات النظام"
        verbose_name_plural = "إعدادات النظام"

    def __str__(self):
        return self.site_name

    def save(self, *args, **kwargs):
        # Allow only one instance
        if not self.pk and SystemSettings.objects.exists():
            return
        super(SystemSettings, self).save(*args, **kwargs)
