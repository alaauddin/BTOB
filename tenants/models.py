from django.db import models
from django_tenants.models import TenantMixin, DomainMixin

class Client(TenantMixin):
    name = models.CharField(max_length=100)
    created_on = models.DateField(auto_now_add=True)

    # Optional: Add fields from Supplier if needed for the tenant itself
    # But usually, Supplier is a profile inside the tenant schema or linked to it.
    # For now, we utilize Client as the logical container.

    auto_create_schema = True

    def __str__(self):
        return self.name

class Domain(DomainMixin):
    def __str__(self):
        return self.domain
