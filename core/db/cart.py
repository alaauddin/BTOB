"""Cart-related models: Cart, CartItem."""

from django.db import models
from django.contrib.auth.models import User

from core.db.supplier import Supplier
from core.db.product import Product


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

    class Meta:
        app_label = 'core'

    def __str__(self):
        return f"{self.quantity} of {self.product.name} in cart"

    def get_subtotal(self):
        return self.product.price * self.quantity

    def get_subtotal_with_discount(self):
        return self.product.get_price_with_offer() * self.quantity

    def has_discount(self):
        return self.product.has_discount()
