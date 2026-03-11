"""Promotion-related models: Promotion, Discount."""

from django.db import models

from core.db.supplier import Supplier


class Promotion(models.Model):
    supplier = models.ForeignKey(Supplier, on_delete=models.CASCADE)
    name = models.CharField(max_length=100)
    description = models.TextField()
    start_date = models.DateField()
    end_date = models.DateField()

    class Meta:
        app_label = 'core'

    def __str__(self):
        return self.name


class Discount(models.Model):
    promotion = models.ForeignKey(Promotion, on_delete=models.CASCADE)
    code = models.CharField(max_length=50, unique=True)
    discount_amount = models.DecimalField(max_digits=5, decimal_places=2)

    class Meta:
        app_label = 'core'

    def __str__(self):
        return f"{self.code} - {self.discount_amount}% off"
