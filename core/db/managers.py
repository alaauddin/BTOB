"""Tenant-aware model managers and querysets.

Provides ``TenantQuerySet`` and ``TenantManager`` that add a
``.for_tenant(supplier)`` helper to easily scope queries to a single
supplier's data, preventing cross-tenant data leakage.

Usage on a model::

    class Product(models.Model):
        supplier = models.ForeignKey(Supplier, ...)
        ...
        objects = TenantManager()

Usage in views::

    products = Product.objects.for_tenant(request.tenant)
"""

from django.db import models


class TenantQuerySet(models.QuerySet):
    """QuerySet with tenant-scoping helpers."""

    def for_tenant(self, supplier):
        """Filter results to a single supplier (tenant).

        Args:
            supplier: A ``Supplier`` instance, or ``None``.
                      When ``None`` the queryset is returned unfiltered
                      (useful for platform-level views).

        Returns:
            A filtered ``QuerySet``.
        """
        if supplier is None:
            return self
        return self.filter(supplier=supplier)


class TenantManager(models.Manager):
    """Default manager that uses ``TenantQuerySet``."""

    def get_queryset(self):
        return TenantQuerySet(self.model, using=self._db)

    def for_tenant(self, supplier):
        """Shortcut to ``get_queryset().for_tenant(supplier)``."""
        return self.get_queryset().for_tenant(supplier)
