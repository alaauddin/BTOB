from django.shortcuts import render, redirect, get_object_or_404
from django.http import JsonResponse
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
import json

from core.forms import SuppierAdsForm
from core.models import Supplier, SuppierAds


@login_required
@require_http_methods(["GET", "POST"])
def edit_ads(request, ad_id):
    # Get the supplier for the current user
    try:
        supplier = get_object_or_404(Supplier, user=request.user)
    except:
        return JsonResponse({
            'success': False, 
            'message': 'You must be a registered supplier to edit ads'
        }, status=403)
    
    # Get the ad and ensure it belongs to the current supplier
    ad = get_object_or_404(SuppierAds, id=ad_id, supplier=supplier)
    
    if request.method == 'POST':
        # Handle AJAX form submission
        if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
            try:
                form = SuppierAdsForm(request.POST, request.FILES, instance=ad, supplier=supplier)
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
            form = SuppierAdsForm(request.POST, request.FILES, instance=ad, supplier=supplier)
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
        form = SuppierAdsForm(instance=ad, supplier=supplier)
    
    # Get current ads count for this supplier
    current_ads_count = SuppierAds.objects.filter(supplier=supplier).count()
    active_ads_count = SuppierAds.objects.filter(supplier=supplier, is_active=True).count()
    
    context = {
        'form': form,
        'ad': ad,
        'supplier': supplier,
        'current_ads_count': current_ads_count,
        'active_ads_count': active_ads_count,
        'is_edit': True
    }
    
    # Return template for regular GET request
    return render(request, 'edit_ads.html', context)
