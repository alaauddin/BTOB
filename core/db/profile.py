from django.db import models
from django.contrib.auth.models import User

class Profile(models.Model):
    USER_TYPE_CHOICES = (
        ('customer', 'Customer'),
        ('supplier', 'Supplier User'),
        ('driver', 'Driver'),
    )
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    user_type = models.CharField(max_length=20, choices=USER_TYPE_CHOICES, default='customer')
    phone_number = models.CharField(max_length=20, unique=True, null=True, blank=True, verbose_name="رقم الهاتف")

    class Meta:
        app_label = 'core'

    def __str__(self):
        return f"{self.user.username} - {self.user_type}"
