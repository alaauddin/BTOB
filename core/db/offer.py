"""Offer-related models: ProductOffer, WishList."""

from django.db import models
from django.contrib.auth.models import User

from core.db.product import Product


class WishList(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='wishlist')
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='wishlist')

    class Meta:
        app_label = 'core'

    def __str__(self):
        return f"{self.user.username} | {self.product.name}"


class ProductOffer(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='products_offer')
    is_active = models.BooleanField(default=True)
    discount_precentage = models.DecimalField(max_digits=10, decimal_places=2)
    from_date = models.DateField()
    to_date = models.DateField()
    create_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='products_offer')

    class Meta:
        app_label = 'core'

    def __str__(self):
        price_after_discount = self.product.price - (self.product.price * self.discount_precentage)
        return str(self.product) + " | " + str(self.product.price) + " |after discount: " + str(price_after_discount)

    def get_price_with_discount(self):
        price_after_discount = self.product.price - (self.product.price * self.discount_precentage)
        return price_after_discount

    def get_discount_percentage_offer(self):
        return self.discount_precentage * 100

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
