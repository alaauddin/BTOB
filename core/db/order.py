"""Order-related models: Order, ShippingAddress, OrderItem, OrderNote, OrderPaymentReference, Payment."""

import math
from decimal import Decimal

from django.db import models
from django.contrib.auth.models import User

from core.db.constants import CITY_CHO, COUNTRY_CHO
from core.db.workflow import OrderStatus, WorkflowStep
from core.db.product import Product


class Order(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    items = models.ManyToManyField(Product, through='OrderItem')
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)
    pipeline_status = models.ForeignKey(OrderStatus, on_delete=models.PROTECT, null=True, blank=True)
    is_stock_decreased = models.BooleanField(default=False, verbose_name="تم تقليل المخزون")
    cancellation_reason = models.TextField(blank=True, null=True, verbose_name="سبب الإلغاء")
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = 'core'

    def __str__(self):
        return f"Order {self.id} by {self.user.username}"

    def get_payment_total(self):
        """Calculate total amount recorded in payment references."""
        return self.payment_references.aggregate(total=models.Sum('amount'))['total'] or 0

    def is_fully_paid(self):
        """Check if total payment references meet or exceed order total."""
        return self.get_payment_total() >= self.total_amount

    def get_current_workflow_step(self):
        supplier = self.get_supplier()
        if not supplier or not supplier.workflow or not self.pipeline_status:
            return None
        return WorkflowStep.objects.filter(workflow=supplier.workflow, status=self.pipeline_status).first()

    def get_next_step(self):
        current_step = self.get_current_workflow_step()
        if not current_step:
            return None

        return WorkflowStep.objects.filter(
            workflow=current_step.workflow,
            priority__gt=current_step.priority
        ).order_by('priority').first()

    def get_next_status(self):
        next_step = self.get_next_step()
        return next_step.status if next_step else None

    def save(self, *args, **kwargs):
        if not self.pipeline_status:
            self.pipeline_status = OrderStatus.objects.filter(slug='pending').first()
        super().save(*args, **kwargs)

    def update_status(self, new_status, reason=None, user=None):
        """Update status and handle workflow logic (payment, stock)."""
        if not new_status:
            return False, "حالة غير صالحة."

        supplier = self.get_supplier()

        # Handle Cancellation Logic
        if new_status.slug == 'cancelled':
            if not reason:
                return False, "يجب إدخال سبب الإلغاء."
            self.cancellation_reason = reason

            # Notify Admin via WhatsApp
            from core.utils.whatsapp_utils import send_whatsapp_message
            from core.db.settings import SystemSettings
            settings = SystemSettings.objects.first()
            if settings and settings.whatsapp_number:
                performer_name = user.username if user else "المسؤول"
                customer_name = self.user.get_full_name() or self.user.username
                admin_msg = (
                    f"⚠️ *تنبيه إلغاء طلب*\n\n"
                    f"تم إلغاء الطلب: *#{self.id}*\n"
                    f"من قبل: *{performer_name}*\n"
                    f"العميل: {customer_name}\n"
                    f"السبب: {reason}"
                )
                send_whatsapp_message(settings.whatsapp_number, admin_msg)

        if not supplier or not supplier.workflow:
            self.pipeline_status = new_status
            self.save()
            return True, f"تم تحديث الحالة إلى {new_status.name}"

        # Get relevant workflow steps
        current_step = self.get_current_workflow_step()
        next_step = WorkflowStep.objects.filter(workflow=supplier.workflow, status=new_status).first()

        # Check conditions if moving forward in priority (AND NOT CANCELLING)
        if new_status.slug != 'cancelled' and current_step and next_step and next_step.priority > current_step.priority:
            # Check payment requirement on CURRENT step before moving
            if current_step.requires_payment and not self.is_fully_paid():
                return False, f"لا يمكن الانتقال: يتوجب سداد كامل المبلغ ({self.total_amount}) للطلب أولاً."

        # Handle stock reduction on NEW step if moving to a step that requires it (AND NOT CANCELLING)
        if new_status.slug != 'cancelled' and next_step and next_step.decrease_stock and not self.is_stock_decreased:
            # 1. Check if we have enough stock for all items
            for item in self.order_items.all():
                if item.product.stock < item.quantity:
                    return False, f"لا يوجد مخزون كافٍ للمنتج: {item.product.name} (المتوفر: {item.product.stock})"

            # 2. Perform reduction
            for item in self.order_items.all():
                item.product.stock -= item.quantity
                item.product.save()

            self.is_stock_decreased = True

        self.pipeline_status = new_status
        self.save()
        return True, f"تم تحديث حالة الطلب إلى: {new_status.name}"

    def move_to_next_status(self):
        next_status = self.get_next_status()
        if not next_status:
            return False, "تم الوصول لآخر مرحلة في سير العمل."

        return self.update_status(next_status)

    def set_total_amount(self):
        items_total = sum([item.get_subtotal_with_discount() for item in self.order_items.all()])
        delivery_fee = self.get_expected_delivery_fee()
        self.total_amount = items_total + delivery_fee
        self.save()

    def get_expected_delivery_fee(self):
        supplier = self.get_supplier()
        if not supplier or not supplier.enable_delivery_fees:
            return Decimal('0')

        shipping_address = self.shippingaddress_set.first()
        if not shipping_address:
            return Decimal('0')

        if supplier.latitude and supplier.longitude and shipping_address.latitude and shipping_address.longitude:
            distance = self.calculate_distance(
                supplier.latitude, supplier.longitude,
                shipping_address.latitude, shipping_address.longitude
            )
            if distance:
                fee = float(distance) * float(supplier.delivery_fee_ratio or 0)
                return Decimal(str(fee)).quantize(Decimal('0.01'))
        return Decimal('0')

    def calculate_distance(self, lat1, lon1, lat2, lon2):
        """Calculate the great circle distance between two points in km."""
        if not all([lat1, lon1, lat2, lon2]):
            return None
        R = 6371  # Earth radius in km
        phi1, phi2 = math.radians(float(lat1)), math.radians(float(lat2))
        dphi = math.radians(float(lat2) - float(lat1))
        dlambda = math.radians(float(lon2) - float(lon1))
        a = math.sin(dphi / 2)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2)**2
        return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    def get_total_amount(self):
        items_total = sum([item.get_subtotal() for item in self.order_items.all()])
        return items_total

    def get_total_ammout_with_discout(self):
        return sum([item.get_subtotal_with_discount() for item in self.order_items.all()])

    def get_total_after_discount(self):
        return self.get_total_ammout_with_discout() + self.get_expected_delivery_fee()

    def get_discount_amount(self):
        items_gross = sum([item.get_subtotal() for item in self.order_items.all()])
        return items_gross - self.get_total_ammout_with_discout()

    def get_supplier(self):
        first_item = self.order_items.first()
        if first_item:
            return first_item.product.supplier
        return None

    def has_discount(self):
        order_items = self.order_items.all()
        for order_item in order_items:
            if order_item.has_discount():
                return True
        return False


class ShippingAddress(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE)
    phone = models.IntegerField()
    address_line1 = models.CharField(max_length=255)
    address_line2 = models.CharField(max_length=255, blank=True, null=True)
    city = models.CharField(max_length=100, choices=CITY_CHO)
    country = models.CharField(max_length=100, choices=COUNTRY_CHO)
    postal_code = models.CharField(max_length=20, blank=True, null=True)
    address_type = models.CharField(max_length=50)  # Shipping or Billing
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)

    class Meta:
        app_label = 'core'

    def __str__(self):
        return "Address of " + str(self.order)


class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='order_items')
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField(default=1)

    class Meta:
        app_label = 'core'

    def __str__(self):
        return f"{self.quantity} x {self.product.name} in Order {self.order.id}"

    def get_subtotal(self):
        return self.product.price * self.quantity

    def get_subtotal_with_discount(self):
        return self.product.get_price_with_offer() * self.quantity

    def has_discount(self):
        return self.product.has_discount()


class OrderNote(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='notes')
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    note = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        app_label = 'core'
        ordering = ['-created_at']

    def __str__(self):
        return f"Note on Order {self.order.id} by {self.user.username}"


class OrderPaymentReference(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='payment_references')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    reference_number = models.CharField(max_length=100)
    recorded_by = models.ForeignKey(User, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        app_label = 'core'
        ordering = ['-created_at']

    def __str__(self):
        return f"Payment Ref {self.reference_number} for Order {self.order.id}"


class Payment(models.Model):
    order = models.OneToOneField(Order, on_delete=models.CASCADE)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    payment_method = models.CharField(max_length=100)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        app_label = 'core'

    def __str__(self):
        return f"Payment for Order {self.order.id}"
