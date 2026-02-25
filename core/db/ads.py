"""Advertising models: SupplierAds, PlatformOfferAd."""

from django.db import models
from django.contrib.auth.models import User

from core.db.utils import upload_to_path
from core.db.supplier import Supplier
from core.db.product import Product


class SupplierAds(models.Model):
    supplier = models.ForeignKey(Supplier, on_delete=models.CASCADE, related_name='supplier_ads')
    title = models.CharField(max_length=200, null=True, blank=True)
    description = models.TextField(max_length=1000, null=True, blank=True)
    image = models.ImageField(upload_to=upload_to_path)
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='supplier_ads')
    created_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='supplier_ads', null=True, blank=True)

    class Meta:
        app_label = 'core'

    def __str__(self):
        return str(self.supplier) + " | " + str(self.title)


class PlatformOfferAd(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='platform_offers')
    description = models.TextField()
    start_date = models.DateField()
    end_date = models.DateField()
    order = models.IntegerField(default=0)
    is_approved = models.BooleanField(default=False)

    class Meta:
        app_label = 'core'

    def __str__(self):
        return str(self.product) + " | " + str(self.order)
