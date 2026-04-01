"""Delivery driver model: links a User to a Supplier as a delivery driver."""

from django.db import models
from django.contrib.auth.models import User


class DeliveryDriver(models.Model):
    """A delivery driver account linked to a specific supplier.

    Parameters
    ----------
    user : User
        The Django auth user account for the driver.
    supplier : Supplier
        The supplier this driver works for.
    phone : str
        Contact phone number for the driver.
    is_active : bool
        Whether the driver is currently active and can receive assignments.
    created_at : datetime
        Timestamp of when the driver profile was created.

    Returns
    -------
    str
        String representation combining driver name and supplier name.
    """

    user = models.ForeignKey(
        User, on_delete=models.CASCADE,
        related_name='delivery_driver_profiles',
        verbose_name="حساب المستخدم",
    )
    supplier = models.ForeignKey(
        'Supplier', on_delete=models.CASCADE,
        related_name='delivery_drivers',
        verbose_name="المورد",
    )
    phone = models.CharField(max_length=20, verbose_name="رقم الهاتف")
    is_active = models.BooleanField(default=True, verbose_name="نشط")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="تاريخ الإنشاء")

    class Meta:
        app_label = 'core'
        unique_together = ['user', 'supplier']
        verbose_name = "سائق توصيل"
        verbose_name_plural = "سائقو التوصيل"

    def __str__(self):
        full_name = self.user.get_full_name() or self.user.username
        return f"{full_name} - {self.supplier.name}"


class DriverLocation(models.Model):
    """Store real-time coordinates of a delivery driver for live tracking."""
    driver = models.ForeignKey(
        DeliveryDriver, on_delete=models.CASCADE,
        related_name='locations',
        verbose_name="السائق"
    )
    latitude = models.DecimalField(max_digits=9, decimal_places=6, verbose_name="خط العرض")
    longitude = models.DecimalField(max_digits=9, decimal_places=6, verbose_name="خط الطول")
    timestamp = models.DateTimeField(auto_now_add=True, verbose_name="الوقت")

    class Meta:
        app_label = 'core'
        ordering = ['-timestamp']
        verbose_name = "موقع السائق"
        verbose_name_plural = "مواقع السائقين"

    def __str__(self):
        return f"{self.driver} at {self.timestamp}"
