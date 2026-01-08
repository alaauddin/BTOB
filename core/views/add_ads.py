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
def add_ads(request):
    # Get the supplier for the current user or via supplier_id/POST for superuser
    supplier_id = request.GET.get('supplier_id') or request.POST.get('supplier_id')
    if request.user.is_superuser and supplier_id:
        supplier = get_object_or_404(Supplier, id=supplier_id)
    else:
        supplier = Supplier.objects.filter(user=request.user).first()
        
    if not supplier:
        return JsonResponse({
            'success': False, 
            'message': 'You must be a registered supplier to add ads'
        }, status=403)
    
    if request.method == 'POST':
        # Handle AJAX form submission
        if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
            try:
                form = SuppierAdsForm(request.POST, request.FILES, supplier=supplier)
                if form.is_valid():
                    ad = form.save(commit=False)
                    ad.supplier = supplier
                    ad.created_by = request.user
                    ad.save()
                    
                    return JsonResponse({
                        'success': True,
                        'message': 'تم إضافة الإعلان بنجاح!',
                        'ad': {
                            'id': ad.id,
                            'title': ad.title,
                            'description': ad.description[:100] + '...' if len(ad.description) > 100 else ad.description,
                            'image_url': ad.image.url if ad.image else None,
                            'is_active': ad.is_active
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
            form = SuppierAdsForm(request.POST, request.FILES, supplier=supplier)
            if form.is_valid():
                ad = form.save(commit=False)
                ad.supplier = supplier
                ad.created_by = request.user
                ad.save()
                messages.success(request, 'تم إضافة الإعلان بنجاح!')
                return redirect('my_merchant')
            else:
                messages.error(request, 'يرجى تصحيح الأخطاء في النموذج')
    
    else:
        form = SuppierAdsForm(supplier=supplier)
    
    # Get current ads count for this supplier
    current_ads_count = SuppierAds.objects.filter(supplier=supplier).count()
    active_ads_count = SuppierAds.objects.filter(supplier=supplier, is_active=True).count()
    
    context = {
        'form': form,
        'supplier': supplier,
        'current_ads_count': current_ads_count,
        'active_ads_count': active_ads_count
    }
    
    # Return template for regular GET request
    return render(request, 'add_ads.html', context)
