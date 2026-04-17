from django.db import models
from django.contrib.auth.models import User

class PaymentMethod(models.Model):
    name = models.CharField(max_length=100)
    logo = models.ImageField(upload_to='payment_methods/')
    requires_proof = models.BooleanField(default=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        app_label = 'core'

    def __str__(self):
        return self.name

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
