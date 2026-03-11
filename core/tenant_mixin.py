"""View mixins for multi-tenant data isolation.

Provides ``TenantFilterMixin`` for class-based views that automatically
scopes querysets to ``request.tenant``.

Usage::

    class ProductListView(TenantFilterMixin, ListView):
        model = Product
"""


class TenantFilterMixin:
    """Mixin for CBVs that auto-scopes querysets to the current tenant.

    Works with any model whose manager exposes a ``.for_tenant()`` method
    (i.e. uses ``TenantManager``).  Falls back to the unfiltered queryset
    when ``request.tenant`` is ``None`` or the manager lacks the method.
    """

    def get_queryset(self):
        """Return the queryset filtered by the current tenant.

        Returns:
            A ``QuerySet`` scoped to ``request.tenant`` when available.
        """
        queryset = super().get_queryset()
        tenant = getattr(self.request, 'tenant', None)
        if tenant and hasattr(queryset, 'for_tenant'):
            return queryset.for_tenant(tenant)
        return queryset
