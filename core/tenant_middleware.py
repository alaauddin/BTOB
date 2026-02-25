"""Subdomain-based tenant resolution middleware.

Extracts the subdomain from the incoming request's Host header, resolves it
to a ``Supplier`` instance, and attaches it to ``request.tenant``.  When a
valid subdomain is detected the request's URL configuration is swapped to
the storefront-specific URL patterns.
"""

import logging

from django.conf import settings
from django.http import Http404

logger = logging.getLogger(__name__)


class SubdomainMiddleware:
    """Resolve the current tenant (Supplier) from the request subdomain.

    Behaviour:
    - Main domain or ``www`` prefix → ``request.tenant = None``
    - Valid subdomain matching an active Supplier → ``request.tenant = <Supplier>``
      and ``request.urlconf`` is swapped to storefront URLs.
    - Unknown subdomain → 404.
    - Hosts that are not sub-domains of ``PLATFORM_DOMAIN`` (e.g. direct IP
      access, ``localhost``) → ``request.tenant = None`` (platform mode).

    Args:
        get_response: The next middleware or view callable in the chain.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        from core.models import Supplier  # lazy to avoid AppRegistryNotReady

        platform_domain = getattr(settings, 'PLATFORM_DOMAIN', 'localhost')
        host = request.get_host().split(':')[0].lower()  # strip port

        # --- Determine if we're on a subdomain ---
        if host == platform_domain or host == f'www.{platform_domain}':
            # Main platform domain – no tenant
            request.tenant = None
        elif host.endswith(f'.{platform_domain}'):
            # Extract subdomain portion: "store1.rawaaj.com" → "store1"
            subdomain = host.removesuffix(f'.{platform_domain}')

            # Guard against multi-level subdomains (e.g. "a.b.rawaaj.com")
            if '.' in subdomain:
                raise Http404("المتجر غير موجود.")

            supplier = (
                Supplier.objects
                .filter(subdomain=subdomain, is_active=True)
                .select_related('workflow', 'currency')
                .first()
            )
            if supplier is None:
                raise Http404("المتجر غير موجود.")

            request.tenant = supplier
            # Swap URL conf so storefront URLs are used
            request.urlconf = 'core.urls_storefront'
        else:
            # Not a sub-domain of our platform (e.g. localhost, IP, other host)
            request.tenant = None

        response = self.get_response(request)
        return response
