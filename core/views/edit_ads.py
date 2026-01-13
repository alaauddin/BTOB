from django.shortcuts import render, redirect, get_object_or_404
from django.http import JsonResponse
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
import json

from core.forms import SupplierAdsForm
from core.models import Supplier, SupplierAds


@login_required
@require_http_methods(["GET", "POST"])
def edit_ads(request, ad_id):
    # Get the supplier for the current user or via supplier_id/POST for superuser
    supplier_id = request.GET.get('supplier_id') or request.POST.get('supplier_id')
    if request.user.is_superuser and supplier_id:
        supplier = get_object_or_404(Supplier, id=supplier_id)
    else:
        supplier = Supplier.objects.filter(user=request.user).first()
        
    if not supplier:
        return JsonResponse({
            'success': False, 
            'message': 'You must be a registered supplier to edit ads'
        }, status=403)
    
    # Get the ad and ensure it belongs to the current supplier
    try:
        ad = SupplierAds.objects.get(id=ad_id, supplier=supplier)
    except SupplierAds.DoesNotExist:
        return JsonResponse({
            'success': False,
            'message': 'الإعلان غير موجود أو لا تملك صلاحية الوصول إليه'
        }, status=404)
    
    if request.method == 'POST':
        # Handle AJAX form submission
        if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
            try:
                form = SupplierAdsForm(request.POST, request.FILES, instance=ad, supplier=supplier)
                if form.is_valid():
                    updated_ad = form.save(commit=False)
                    updated_ad.supplier = supplier
                    updated_ad.created_by = request.user
                    updated_ad.save()
                    
                    return JsonResponse({
                        'success': True,
                        'message': 'تم تحديث الإعلان بنجاح!',
                        'ad': {
                            'id': updated_ad.id,
                            'title': updated_ad.title,
                            'description': updated_ad.description[:100] + '...' if len(updated_ad.description) > 100 else updated_ad.description,
                            'image_url': updated_ad.image.url if updated_ad.image else None,
                            'is_active': updated_ad.is_active
                        }
                    })
                else:
                    # Return form errors
                    errors = {}
                    for field, error_list in form.errors.items():
                        if field == '__all__':
                            errors['general'] = error_list[0]
                        else:
                            errors[field] = error_list[0]  # Get first error for each field
                    
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
        
        # Handle regular form submission
        else:
            form = SupplierAdsForm(request.POST, request.FILES, instance=ad, supplier=supplier)
            if form.is_valid():
                updated_ad = form.save(commit=False)
                updated_ad.supplier = supplier
                updated_ad.created_by = request.user
                updated_ad.save()
                messages.success(request, 'تم تحديث الإعلان بنجاح!')
                return redirect('my_merchant')
            else:
                messages.error(request, 'يرجى تصحيح الأخطاء في النموذج')
    
    else:
        if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
            return JsonResponse({
                'success': True,
                'ad': {
                    'id': ad.id,
                    'title': ad.title,
                    'description': ad.description,
                    'image_url': ad.image.url if ad.image else None,
                    'is_active': ad.is_active,
                    'product_id': ad.product.id if ad.product else None
                }
            })
        form = SupplierAdsForm(instance=ad, supplier=supplier)
    
    # Get current ads count for this supplier
    current_ads_count = SupplierAds.objects.filter(supplier=supplier).count()
    active_ads_count = SupplierAds.objects.filter(supplier=supplier, is_active=True).count()
    
    context = {
        'form': form,
        'ad': ad,
        'supplier': supplier,
        'current_ads_count': current_ads_count,
        'active_ads_count': active_ads_count,
        'is_edit': True
    }
    
    return render(request, 'edit_ads.html', context)
