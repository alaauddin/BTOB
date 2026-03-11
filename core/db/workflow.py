"""Order workflow models: OrderStatus, OrderWorkflow, WorkflowStep."""

from django.db import models


class OrderStatus(models.Model):
    name = models.CharField(max_length=100)
    slug = models.SlugField(max_length=100, unique=True)
    description = models.TextField(blank=True, null=True)
    is_terminal = models.BooleanField(default=False)

    class Meta:
        app_label = 'core'

    def __str__(self):
        return self.name


class OrderWorkflow(models.Model):
    name = models.CharField(max_length=100)
    is_default = models.BooleanField(default=False)

    class Meta:
        app_label = 'core'

    def __str__(self):
        return self.name


class WorkflowStep(models.Model):
    workflow = models.ForeignKey(OrderWorkflow, on_delete=models.CASCADE, related_name='steps')
    status = models.ForeignKey(OrderStatus, on_delete=models.CASCADE)
    priority = models.PositiveIntegerField()
    requires_payment = models.BooleanField(default=False, verbose_name="يتطلب سداد كامل")
    decrease_stock = models.BooleanField(default=False, verbose_name="تقليل المخزون")

    class Meta:
        app_label = 'core'
        ordering = ['priority']
        unique_together = ['workflow', 'status']

    def __str__(self):
        return f"{self.workflow.name} - {self.status.name} ({self.priority})"
