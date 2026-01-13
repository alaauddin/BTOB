from django.shortcuts import get_object_or_404
from django.http import JsonResponse
from django.contrib.auth.decorators import login_required
from django.views.decorators.http import require_POST
from core.models import SupplierAds, Supplier

@login_required
@require_POST
def toggle_ad_status(request, ad_id):
    try:
        # Determine permission context
        if request.user.is_superuser:
            ad = SupplierAds.objects.get(id=ad_id)
        else:
            supplier = Supplier.objects.get(user=request.user)
            ad = SupplierAds.objects.get(id=ad_id, supplier=supplier)
        
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
    except (SupplierAds.DoesNotExist, Supplier.DoesNotExist):
        return JsonResponse({
            'success': False,
            'message': 'الإعلان غير موجود أو لا تملك صلاحية الوصول إليه'
        }, status=404)
    except Exception as e:
        return JsonResponse({
            'success': False,
            'message': f'حدث خطأ: {str(e)}'
        }, status=500)
