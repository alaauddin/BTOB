"""View for tracking WhatsApp inquiry button clicks on product detail pages."""

from django.http import JsonResponse
from django.views.decorators.http import require_POST
from django.shortcuts import get_object_or_404

from core.models import Product, Supplier, WhatsAppInquiryClick


@require_POST
def track_wa_inquiry_click(request, product_id):
    """Record a WhatsApp inquiry click for analytics.

    Args:
        request: The HTTP request object.
        product_id: The ID of the product being inquired about.

    Returns:
        JsonResponse with success status.
    """
    product = get_object_or_404(Product, pk=product_id)
    supplier = product.supplier

    WhatsAppInquiryClick.objects.create(
        product=product,
        supplier=supplier,
        user=request.user if request.user.is_authenticated else None,
        session_key=request.session.session_key or '',
    )

    return JsonResponse({'success': True})
