from django.db import models
from django.utils import timezone
from core.db.supplier import Supplier
from core.db.utils import upload_to_path

class Plan(models.Model):
    name = models.CharField(max_length=100, verbose_name="اسم الباقة")
    price = models.DecimalField(max_digits=10, decimal_places=2, verbose_name="السعر")
    currency = models.CharField(max_length=10, default="د.ك", verbose_name="العملة")
    duration_days = models.PositiveIntegerField(default=30, verbose_name="المدة بالأيام")
    description = models.TextField(blank=True, null=True, verbose_name="الوصف")
    
    # Feature Flags
    max_products = models.PositiveIntegerField(default=10, verbose_name="الحد الأقصى للمنتجات")
    max_categories = models.PositiveIntegerField(default=3, verbose_name="الحد الأقصى للفئات")
    can_use_custom_subdomain = models.BooleanField(default=False, verbose_name="نطاق فرعي مخصص")
    can_buy_wholesale = models.BooleanField(default=False, verbose_name="شراء بالجملة")
    enable_delivery_drivers = models.BooleanField(default=False, verbose_name="نظام السائقين")
    show_system_logo = models.BooleanField(default=True, verbose_name="عرض شعار المنصة")
    
    is_active = models.BooleanField(default=True, verbose_name="نشط")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} ({self.price} د.ك)"

class PlanFeature(models.Model):
    plan = models.ForeignKey(Plan, on_delete=models.CASCADE, related_name='features', verbose_name="الباقة")
    title = models.CharField(max_length=200, verbose_name="الميزة")
    is_included = models.BooleanField(default=True, verbose_name="مضمنة")
    order = models.PositiveIntegerField(default=0, verbose_name="الترتيب")

    class Meta:
        ordering = ['order']
        verbose_name = "ميزة الباقة"
        verbose_name_plural = "ميزات الباقات"

    def __str__(self):
        return f"{self.plan.name} - {self.title}"

class Subscription(models.Model):
    STATUS_CHOICES = [
        ('active', 'نشط'),
        ('expired', 'منتهي'),
        ('pending', 'قيد الانتظار'),
        ('cancelled', 'ملغي'),
    ]
    supplier = models.ForeignKey(Supplier, on_delete=models.CASCADE, related_name='subscriptions')
    plan = models.ForeignKey(Plan, on_delete=models.PROTECT)
    start_date = models.DateTimeField(default=timezone.now)
    end_date = models.DateTimeField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    is_trial = models.BooleanField(default=False)

    def is_active(self):
        return self.status == 'active' and self.end_date > timezone.now()

    def __str__(self):
        return f"{self.supplier.name} - {self.plan.name}"

class SubscriptionPaymentMethod(models.Model):
    name = models.CharField(max_length=100, verbose_name="طريقة الدفع")
    logo = models.ImageField(upload_to=upload_to_path, blank=True, null=True, verbose_name="الشعار")
    instructions = models.TextField(blank=True, null=True, verbose_name="تعليمات الدفع")
    is_active = models.BooleanField(default=True, verbose_name="نشط")

    def __str__(self):
        return self.name

class PaymentMethodField(models.Model):
    FIELD_TYPES = [
        ('text', 'نص'),
        ('number', 'رقم'),
        ('date', 'تاريخ'),
        ('pic', 'صورة/مرفق'),
    ]
    payment_method = models.ForeignKey(SubscriptionPaymentMethod, on_delete=models.CASCADE, related_name='fields')
    label = models.CharField(max_length=100, verbose_name="اسم الحقل")
    field_type = models.CharField(max_length=20, choices=FIELD_TYPES, default='text')
    is_required = models.BooleanField(default=True, verbose_name="إلزامي")
    placeholder = models.CharField(max_length=200, blank=True, null=True, verbose_name="نص توضيحي")
    validation_regex = models.CharField(max_length=200, blank=True, null=True, verbose_name="التحقق (Regex)")

    def __str__(self):
        return f"{self.label} ({self.payment_method.name})"

class SubscriptionPayment(models.Model):
    STATUS_CHOICES = [
        ('pending', 'قيد المراجعة'),
        ('completed', 'مكتمل'),
        ('failed', 'فشل'),
    ]
    subscription = models.ForeignKey(Subscription, on_delete=models.CASCADE, related_name='payments')
    payment_method = models.ForeignKey(SubscriptionPaymentMethod, on_delete=models.SET_NULL, null=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    submitted_data = models.JSONField(default=dict, blank=True, help_text="Values for dynamic fields")
    receipt_image = models.ImageField(upload_to=upload_to_path, blank=True, null=True, verbose_name="إيصال الدفع")
    transaction_reference = models.CharField(max_length=100, blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Payment for {self.subscription.supplier.name} - {self.amount}"
