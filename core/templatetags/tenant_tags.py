"""Template tags for multi-tenant subdomain URL generation."""

from django import template
from django.conf import settings

register = template.Library()


@register.simple_tag(takes_context=True)
def store_url(context, supplier, path=''):
    """Build an absolute URL pointing to a supplier's subdomain storefront.

    Usage in templates::

        {% load tenant_tags %}
        {% store_url supplier %}                → //store1.rawaaj.com/
        {% store_url supplier '/p/5/' %}        → //store1.rawaaj.com/p/5/

    Falls back to the legacy ``/products/<store_id>/`` path when the
    supplier has no subdomain set.

    Args:
        context: Template context (used to access the request).
        supplier: A ``Supplier`` model instance.
        path: Optional path to append after the subdomain root.

    Returns:
        A protocol-relative URL string.
    """
    request = context.get('request')
    platform_domain = getattr(settings, 'PLATFORM_DOMAIN', 'localhost')

    # Determine scheme
    if request:
        scheme = 'https' if request.is_secure() else 'http'
    else:
        scheme = 'https'

    if supplier and getattr(supplier, 'subdomain', None):
        # Build subdomain URL
        port = ''
        if request:
            host = request.get_host()
            if ':' in host:
                port = ':' + host.split(':')[1]
        return f"{scheme}://{supplier.subdomain}.{platform_domain}{port}/{path.lstrip('/')}"

    # Fallback: legacy path-based URL
    if supplier and getattr(supplier, 'store_id', None):
        return f"/store/{supplier.store_id}/{path.lstrip('/')}"

    return '#'
