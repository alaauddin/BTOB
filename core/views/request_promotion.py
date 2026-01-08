import json
from django.shortcuts import get_object_or_404
from django.http import JsonResponse
from django.contrib.auth.decorators import login_required
from django.views.decorators.http import require_http_methods
from core.models import Supplier, PlatformOfferAd, Product
from core.forms import PlatformOfferAdForm

@login_required
@require_http_methods(["POST"])
def request_promotion(request):
    """Handle AJAX requests from merchants to create a platform promotion (PlatformOfferAd)."""
    
    # Get the supplier for the current user or via supplier_id for superuser
    supplier_id = request.POST.get('supplier_id')
    if request.user.is_superuser and supplier_id:
        supplier = get_object_or_404(Supplier, id=supplier_id)
    else:
        supplier = Supplier.objects.filter(user=request.user).first()
        
    if not supplier:
        return JsonResponse({
            'success': False, 
            'message': 'You must be a registered supplier to request promotions'
        }, status=403)
        
    try:
        form = PlatformOfferAdForm(request.POST, supplier=supplier)
        if form.is_valid():
            promotion = form.save(commit=False)
            # Ensure is_approved is False (default in model, but being explicit)
            promotion.is_approved = False
            promotion.save()
            
            return JsonResponse({
                'success': True,
                'message': 'تم إرسال طلب الترويج بنجاح! بانتظار موافقة الإدارة.',
                'promotion': {
                    'id': promotion.id,
                    'product_name': promotion.product.name,
                    'is_approved': promotion.is_approved
                }
            })
        else:
            # Return form errors
            errors = {}
            for field, error_list in form.errors.items():
                errors[field] = error_list[0]
            
            return JsonResponse({
                'success': False,
                'message': 'يرجى تصحيح الأخطاء في النموذج',
                'errors': errors
            }, status=400)
            
    except Exception as e:
        return JsonResponse({
            'success': False,
            'message': f'حدث خطأ: {str(e)}'
        }, status=500)
