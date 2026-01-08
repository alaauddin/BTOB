from django.shortcuts import render, redirect, get_object_or_404
from django.http import JsonResponse
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
import json

from core.forms import ProductForm
from core.models import Supplier, ProductCategory, Product, Category


@login_required
@require_http_methods(["GET", "POST"])
def edit_product(request, product_id):
    # Get the supplier for the current user
    # Determine supplier and fetch product
    if request.user.is_superuser:
        product = get_object_or_404(Product, id=product_id)
        supplier = product.supplier
    else:
        try:
            supplier = get_object_or_404(Supplier, user=request.user)
        except:
             return JsonResponse({
                'success': False, 
                'message': 'You must be a registered supplier to edit products'
            }, status=403)
        product = get_object_or_404(Product, id=product_id, supplier=supplier)

    # Handle AJAX GET request for product details
    if request.method == 'GET' and request.headers.get('X-Requested-With') == 'XMLHttpRequest':
        return JsonResponse({
            'success': True,
            'product': {
                'id': product.id,
                'name': product.name,
                'description': product.description,
                'price': str(product.price),
                'category_id': product.category.id if product.category else None,
                'is_new': product.is_new,
                'is_active': product.is_active,
                'image_url': product.image.url if product.image else None
            }
        })
    
    if request.method == 'POST':
        # Handle AJAX form submission
        if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
            try:
                form = ProductForm(request.POST, request.FILES, instance=product, supplier=supplier)
                if form.is_valid():
                    updated_product = form.save(commit=False)
                    updated_product.supplier = supplier
                    updated_product.save()
                    
                    return JsonResponse({
                        'success': True,
                        'message': 'تم تحديث المنتج بنجاح!',
                        'product': {
                            'id': updated_product.id,
                            'name': updated_product.name,
                            'price': str(updated_product.price),
                            'image_url': updated_product.image.url if updated_product.image else None
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
            form = ProductForm(request.POST, request.FILES, instance=product, supplier=supplier)
            if form.is_valid():
                updated_product = form.save(commit=False)
                updated_product.supplier = supplier
                updated_product.save()
                messages.success(request, 'تم تحديث المنتج بنجاح!')
                
                # If superuser is editing for another merchant, redirect back to that merchant's dashboard
                if request.user.is_superuser and supplier.user != request.user:
                    return redirect(f"/my-merchant/?supplier_id={supplier.id}")
                    
                return redirect('my_merchant')
            else:
                messages.error(request, 'يرجى تصحيح الأخطاء في النموذج')
    
    else:
        form = ProductForm(instance=product, supplier=supplier)
    
    # Get all categories (global)
    categories = Category.objects.all()
    
    context = {
        'form': form,
        'product': product,
        'supplier': supplier,
        'categories': categories,
        'is_edit': True
    }
    
    # Return template for regular GET request
    return render(request, 'edit_product.html', context)

