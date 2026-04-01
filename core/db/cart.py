"""Cart-related models: Cart, CartItem."""

from django.db import models
from django.contrib.auth.models import User

from core.db.supplier import Supplier
from core.db.product import Product, ProductAttributeOption


class Cart(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='cart')
    supplier = models.ForeignKey(Supplier, on_delete=models.CASCADE)

    class Meta:
        app_label = 'core'

    def __str__(self):
        return f"Cart for {self.user.username}"

    def get_total_items(self):
        return sum([item.quantity for item in self.cart_items.all()])

    def get_total_amount(self):
        return sum([item.get_subtotal() for item in self.cart_items.all()])

    def get_total_ammout_with_discout(self):
        total_with_discount = sum([item.get_subtotal_with_discount() for item in self.cart_items.all()])
        return self.get_total_amount() - total_with_discount

    def get_total_after_discount(self):
        return sum([item.get_subtotal_with_discount() for item in self.cart_items.all()])

    def has_discount(self):
        cart_items = self.cart_items.all()
        for cart_item in cart_items:
            if cart_item.has_discount():
                return True
        return False


class CartItem(models.Model):
    cart = models.ForeignKey(Cart, on_delete=models.CASCADE, related_name='cart_items')
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='cart_items')
    quantity = models.PositiveIntegerField(default=1)
    
    # Pricing fields (Locked at addition time)
    price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, verbose_name="السعر الأساسي عند الإضافة")
    discount_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, verbose_name="سعر العرض عند الإضافة")
    price_modifier_total = models.DecimalField(max_digits=10, decimal_places=2, default=0.00, verbose_name="مجموع إضافات الخيارات")
    
    selected_options = models.ManyToManyField(ProductAttributeOption, blank=True)

    class Meta:
        app_label = 'core'

    def __str__(self):
        return f"{self.quantity} of {self.product.name} in cart"

    def get_options_price_modifier(self):
        # Prefer the locked modifier total if it exists
        if self.price_modifier_total:
            return self.price_modifier_total
        return sum([option.price_modifier for option in self.selected_options.all()])

    def get_unit_price(self):
        # Prefer locked price, then product current price
        if self.price is not None:
            return self.price + self.get_options_price_modifier()
            
        option_ids = self.selected_options.values_list('id', flat=True)
        return self.product.get_total_price(option_ids, with_offer=False)

    def get_unit_price_with_discount(self):
        # Prefer locked discount_price, then locked price
        if self.discount_price is not None:
             return self.discount_price + self.get_options_price_modifier()
        elif self.price is not None:
             return self.price + self.get_options_price_modifier()
             
        # Fallback to current product offer
        option_ids = self.selected_options.values_list('id', flat=True)
        return self.product.get_total_price(option_ids, with_offer=True)

    def get_subtotal(self):
        return self.get_unit_price() * self.quantity

    def get_subtotal_with_discount(self):
        return self.get_unit_price_with_discount() * self.quantity

    def has_discount(self):
        return self.product.has_discount()
