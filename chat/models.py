from django.db import models
from django.contrib.auth.models import User

class Thread(models.Model):
    customer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='customer_threads', null=True, blank=True)
    guest_id = models.CharField(max_length=100, null=True, blank=True, db_index=True)
    supplier = models.ForeignKey('core.Supplier', on_delete=models.CASCADE, related_name='threads')
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at']

    def __str__(self):
        name = self.customer.username if self.customer else f"Guest {self.guest_id[:8]}"
        return f"Chat between {name} and {self.supplier.name}"

class Message(models.Model):
    thread = models.ForeignKey(Thread, on_delete=models.CASCADE, related_name='messages')
    sender = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)
    guest_id = models.CharField(max_length=100, null=True, blank=True)
    text = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        name = self.sender.username if self.sender else "Guest"
        return f"Message from {name} at {self.created_at}"

