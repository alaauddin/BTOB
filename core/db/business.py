"""Business request model."""

from django.db import models


class BusinessRequest(models.Model):
    name = models.CharField(max_length=200, verbose_name="اسم النشاط التجاري")
    owner_name = models.CharField(max_length=200, verbose_name="اسم صاحب النشاط")
    email = models.EmailField(verbose_name="البريد الإلكتروني")
    phone = models.CharField(max_length=20, verbose_name="رقم الهاتف")
    business_type = models.CharField(max_length=100, verbose_name="نوع النشاط")
    message = models.TextField(verbose_name="رسالة إضافية", blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    is_processed = models.BooleanField(default=False, verbose_name="تمت المعالجة")

    class Meta:
        app_label = 'core'
        verbose_name = "طلب انضمام نشاط تجاري"
        verbose_name_plural = "طلبات انضمام الأنشطة التجارية"

    def __str__(self):
        return self.name
