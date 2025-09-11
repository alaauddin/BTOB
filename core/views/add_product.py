from django.shortcuts import render, redirect, get_object_or_404
from django.http import JsonResponse
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
import json

from core.forms import ProductForm
from core.models import Supplier, ProductCategory


@login_required
@require_http_methods(["GET", "POST"])
def add_product(request):
    # Get the supplier for the current user
    try:
        supplier = get_object_or_404(Supplier, user=request.user)
    except:
        return JsonResponse({
            'success': False, 
            'message': 'You must be a registered supplier to add products'
        }, status=403)
    
    if request.method == 'POST':
        # Handle AJAX form submission
        if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
            try:
                form = ProductForm(request.POST, request.FILES, supplier=supplier)
                if form.is_valid():
                    product = form.save(commit=False)
                    product.supplier = supplier
                    product.save()
                    
                    return JsonResponse({
                        'success': True,
                        'message': 'تم إضافة المنتج بنجاح!',
                        'product': {
                            'id': product.id,
                            'name': product.name,
                            'price': str(product.price),
                            'image_url': product.image.url if product.image else None
                        }
                    })
                else:
                    # Return form errors
                    errors = {}
                    for field, error_list in form.errors.items():
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
            form = ProductForm(request.POST, request.FILES, supplier=supplier)
            if form.is_valid():
                product = form.save(commit=False)
                product.supplier = supplier
                product.save()
                messages.success(request, 'تم إضافة المنتج بنجاح!')
                return redirect('my_merchant')
            else:
                messages.error(request, 'يرجى تصحيح الأخطاء في النموذج')
    
    else:
        form = ProductForm(supplier=supplier)
    
    # Get categories for this supplier
    categories = ProductCategory.objects.filter(category__supplier=supplier)
    
    context = {
        'form': form,
        'supplier': supplier,
        'categories': categories
    }
    
    # Return template for regular GET request
    return render(request, 'add_product.html', context)
