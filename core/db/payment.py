from django.db import models
from django.contrib.auth.models import User

class PaymentMethod(models.Model):
    name = models.CharField(max_length=100)
    logo = models.ImageField(upload_to='payment_methods/', null=True, blank=True)
    requires_proof = models.BooleanField(default=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        app_label = 'core'

    def __str__(self):
        return self.name

    @property
    def logo_url(self):
        try:
            if self.logo and hasattr(self.logo, 'url'):
                return self.logo.url
        except (ValueError, AttributeError):
            pass
        return None

class SupplierPaymentMethod(models.Model):
    supplier = models.ForeignKey('Supplier', on_delete=models.CASCADE, related_name='payment_methods')
    payment_method = models.ForeignKey(PaymentMethod, on_delete=models.CASCADE)
    account_field_name = models.CharField(max_length=100, default="Wallet Number")
    account_field_value = models.CharField(max_length=255)
    is_active = models.BooleanField(default=True)

    class Meta:
        app_label = 'core'
        unique_together = ('supplier', 'payment_method')

    def __str__(self):
        return f"{self.supplier.name} - {self.payment_method.name}"

    @property
    def logo_url(self):
        if self.payment_method:
            return self.payment_method.logo_url
        return None

class PaymentTransaction(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('verified', 'Verified'),
        ('rejected', 'Rejected'),
    ]

    order = models.OneToOneField('Order', on_delete=models.CASCADE, related_name='payment_transaction')
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    supplier_payment_method = models.ForeignKey(SupplierPaymentMethod, on_delete=models.SET_NULL, null=True, blank=True)
    payment_method = models.ForeignKey(PaymentMethod, on_delete=models.SET_NULL, null=True, blank=True)
    receipt = models.ImageField(upload_to='payment_receipts/', null=True, blank=True)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='pending')
    verification_notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        app_label = 'core'

    def __str__(self):
        return f"Payment for Order {self.order.id} - {self.status}"


class SupplierHasadPayConfig(models.Model):
    ENVIRONMENT_CHOICES = [
        ('production', 'بيئة الإنتاج الحية (Production)'),
        ('sandbox', 'بيئة الاختبار التجريبية (Sandbox/Test)'),
    ]

    supplier = models.OneToOneField('Supplier', on_delete=models.CASCADE, related_name='hasadpay_config')
    is_enabled = models.BooleanField(default=False, verbose_name="تفعيل بوابة حصاد باي")
    api_key = models.CharField(max_length=255, blank=True, null=True, verbose_name="مفتاح API (API Key)")
    entity_id = models.CharField(max_length=100, blank=True, null=True, verbose_name="معرف القناة (Entity ID)")
    webhook_secret = models.CharField(max_length=255, blank=True, null=True, verbose_name="المفتاح السري للـ Webhook (Webhook Secret)")
    environment = models.CharField(max_length=20, choices=ENVIRONMENT_CHOICES, default='production', verbose_name="البيئة")
    custom_base_url = models.URLField(blank=True, null=True, verbose_name="رابط بوابة مخصص (اختياري)")
    display_name = models.CharField(max_length=100, default="حصاد باي - الدفع الإلكتروني المباشر", verbose_name="الاسم الظاهر للعملاء")
    auto_confirm_order = models.BooleanField(default=True, verbose_name="تأكيد الطلب تلقائياً عند نجاح الدفع")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = 'core'
        verbose_name = "إعدادات حصاد باي للتاجر"
        verbose_name_plural = "إعدادات حصاد باي للتجار"

    def __str__(self):
        status = "مفعل" if self.is_enabled else "معطل"
        return f"HasadPay ({self.supplier.name}) - {status}"

    def get_client(self):
        """Initializes and returns a HasadPayClient configured for this supplier."""
        try:
            from hasadpay import HasadPayClient, Environment
            base_url = self.custom_base_url
            if not base_url:
                base_url = Environment.SANDBOX if self.environment == 'sandbox' else Environment.PRODUCTION

            return HasadPayClient(
                api_key=self.api_key or "",
                entity_id=self.entity_id or None,
                webhook_secret=self.webhook_secret or None,
                base_url=base_url,
            )
        except ImportError:
            return None

    def get_webhook_url(self, request=None):
        """Returns the absolute or relative webhook URL for this supplier."""
        from django.urls import reverse
        relative_url = reverse('hasadpay_store_webhook', kwargs={'store_id': self.supplier.store_id or self.supplier.id})
        if request:
            return request.build_absolute_uri(relative_url)
        return relative_url


class HasadPayTransaction(models.Model):
    STATUS_CHOICES = [
        ('pending', 'قيد الانتظار'),
        ('paid', 'مدفوع بنجاح'),
        ('failed', 'فشلت العملية'),
        ('cancelled', 'ملغية'),
    ]

    order = models.OneToOneField('Order', on_delete=models.CASCADE, related_name='hasadpay_transaction')
    supplier = models.ForeignKey('Supplier', on_delete=models.CASCADE, related_name='hasadpay_transactions')
    transaction_id = models.CharField(max_length=100, blank=True, null=True, db_index=True, verbose_name="معرف العملية (ID)")
    transaction_uuid = models.CharField(max_length=100, blank=True, null=True, db_index=True, verbose_name="معرف UUID")
    amount = models.DecimalField(max_digits=12, decimal_places=2, verbose_name="المبلغ")
    currency = models.CharField(max_length=10, default='YER', verbose_name="العملة")
    service = models.CharField(max_length=50, blank=True, null=True, verbose_name="رمز الوسيلة (Service)")
    service_name = models.CharField(max_length=100, blank=True, null=True, verbose_name="اسم الوسيلة")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending', verbose_name="حالة الدفع")
    status_code = models.CharField(max_length=50, blank=True, null=True, verbose_name="رمز الحالة")
    status_display = models.CharField(max_length=100, blank=True, null=True, verbose_name="وصف الحالة")
    checkout_url = models.URLField(max_length=500, blank=True, null=True, verbose_name="رابط الدفع المستضاف")
    customer_phone = models.CharField(max_length=30, blank=True, null=True, verbose_name="هاتف العميل")
    customer_name = models.CharField(max_length=100, blank=True, null=True, verbose_name="اسم العميل")
    raw_response = models.JSONField(default=dict, blank=True, verbose_name="استجابة البوابة")
    raw_webhook_payload = models.JSONField(default=dict, blank=True, verbose_name="بيانات الإشعار")
    paid_at = models.DateTimeField(blank=True, null=True, verbose_name="تاريخ السداد")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = 'core'
        verbose_name = "عملية دفع حصاد باي"
        verbose_name_plural = "عمليات دفع حصاد باي"

    def __str__(self):
        return f"HasadPay #{self.transaction_id or self.id} - Order #{self.order_id} ({self.status})"

