from django.shortcuts import get_object_or_404
from django.http import JsonResponse
from django.contrib.auth.decorators import login_required
from django.views.decorators.http import require_POST
from core.models import SuppierAds, Supplier

@login_required
@require_POST
def toggle_ad_status(request, ad_id):
    # Get the supplier for the current user
    if request.user.is_superuser and request.POST.get('supplier_id'):
        supplier_id = request.POST.get('supplier_id')
        supplier = get_object_or_404(Supplier, id=supplier_id)
    else:
        supplier = get_object_or_404(Supplier, user=request.user)
    
    # Get the ad and ensure it belongs to the current supplier
    ad = get_object_or_404(SuppierAds, id=ad_id, supplier=supplier)
    
    # Toggle status
    ad.is_active = not ad.is_active
    ad.save()
    
    status_text = "نشط" if ad.is_active else "غير نشط"
    
    return JsonResponse({
        'success': True,
        'message': f'تمت {"تنشيط" if ad.is_active else "تعطيل"} الإعلان بنجاح',
        'is_active': ad.is_active,
        'status_text': status_text
    })
