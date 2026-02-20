"""
View to mark a product tour as complete for the authenticated merchant.

Accepts POST requests and sets the supplier's `has_seen_products_tour` flag
to True. Returns a JSON response indicating success or failure.
"""
import json
from django.http import JsonResponse
from django.contrib.auth.decorators import login_required
from django.views.decorators.http import require_POST


@login_required
@require_POST
def mark_tour_complete(request):
    """Mark the merchant products page tour as completed.

    Sets ``supplier.has_seen_products_tour = True`` and returns
    ``{"status": "ok"}``. The tour name is read from the request body
    so the same endpoint can serve future tours.

    Parameters
    ----------
    request : HttpRequest
        Must be a POST with an optional JSON body ``{"tour": "<name>"}``.

    Returns
    -------
    JsonResponse
        ``{"status": "ok"}`` on success, or an error with status 400/403.
    """
    supplier = getattr(request.user, 'supplier', None)
    if not supplier:
        return JsonResponse({'status': 'error', 'message': 'ليس لديك متجر.'}, status=403)

    # Determine which tour was completed
    try:
        body = json.loads(request.body) if request.body else {}
    except (json.JSONDecodeError, ValueError):
        body = {}

    tour_name = body.get('tour', 'products')

    if tour_name == 'products':
        supplier.has_seen_products_tour = True
        supplier.save(update_fields=['has_seen_products_tour'])

    return JsonResponse({'status': 'ok'})
