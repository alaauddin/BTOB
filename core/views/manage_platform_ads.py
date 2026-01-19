from django.shortcuts import get_object_or_404
from django.http import JsonResponse
from django.contrib.auth.decorators import login_required
from core.decorators import merchant_required
from django.views.decorators.http import require_http_methods
from core.models import Supplier, SupplierAdPlatfrom
from core.forms import SupplierAdPlatfromForm
import logging

logger = logging.getLogger(__name__)

@merchant_required
@require_http_methods(["POST"])
def add_platform_ad(request):
    supplier_id = request.POST.get('supplier_id')
    if request.user.is_superuser and supplier_id:
        supplier = get_object_or_404(Supplier, id=supplier_id)
    else:
        supplier = getattr(request.user, 'supplier', None)
        
    if not supplier:
        return JsonResponse({'success': False, 'message': 'Supplier not found'}, status=403)

    form = SupplierAdPlatfromForm(request.POST, request.FILES)
    if form.is_valid():
        ad = form.save(commit=False)
        ad.supplier = supplier
        ad.approved = False # Wait for admin approval
        
        # Fallback for link if not provided (handling legacy DB schema)
        if not ad.link:
            ad.link = "" 
            
        ad.save()
        return JsonResponse({
            'success': True,
            'message': 'تم إضافة الإعلان بنجاح! بانتظار الموافقة.',
            'ad': {
                'id': ad.id,
                'image_url': ad.image.url,
                'link': ad.link,
                'is_active': ad.is_active,
                'approved': ad.approved
            }
        })
    else:
        errors = {field: errors[0] for field, errors in form.errors.items()}
        return JsonResponse({'success': False, 'message': 'يرجى تصحيح الأخطاء', 'errors': errors}, status=400)

@merchant_required
@require_http_methods(["GET", "POST"])
def edit_platform_ad(request, ad_id):
    ad = get_object_or_404(SupplierAdPlatfrom, id=ad_id)
    
    # Permission check
    if not request.user.is_superuser and ad.supplier.user != request.user:
        return JsonResponse({'success': False, 'message': 'Unauthorized'}, status=403)

    if request.method == 'GET':
        return JsonResponse({
            'success': True,
            'ad': {
                'id': ad.id,
                'image_url': ad.image.url,
                'link': ad.link,
                'is_active': ad.is_active
            }
        })
    
    # POST
    form = SupplierAdPlatfromForm(request.POST, request.FILES, instance=ad)
    if form.is_valid():
        ad = form.save()
        # Note: Maybe reset approval on edit? keeping it simple for now.
        return JsonResponse({'success': True, 'message': 'تم تحديث الإعلان بنجاح'})
    else:
        errors = {field: errors[0] for field, errors in form.errors.items()}
        return JsonResponse({'success': False, 'message': 'يرجى تصحيح الأخطاء', 'errors': errors}, status=400)

@merchant_required
@require_http_methods(["POST"])
def toggle_platform_ad_status(request, ad_id):
    ad = get_object_or_404(SupplierAdPlatfrom, id=ad_id)
    
    if not request.user.is_superuser and ad.supplier.user != request.user:
        return JsonResponse({'success': False, 'message': 'Action not allowed'}, status=403)
        
    ad.is_active = not ad.is_active
    ad.save()
    
    status_msg = "نشط" if ad.is_active else "غير نشط"
    return JsonResponse({'success': True, 'message': f'تم تغيير حالة الإعلان إلى {status_msg}', 'is_active': ad.is_active})
