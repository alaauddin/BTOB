from django.shortcuts import render, redirect, get_object_or_404
from django.http import JsonResponse
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
import json

from core.forms import ProductOfferForm
from core.models import Supplier, Product, ProductOffer


@login_required
@require_http_methods(["GET", "POST"])
def add_product_offer(request):
    # Get the supplier for the current user
    try:
        supplier = get_object_or_404(Supplier, user=request.user)
    except:
        return JsonResponse({
            'success': False, 
            'message': 'You must be a registered supplier to add product offers'
        }, status=403)
    
    if request.method == 'POST':
        # Handle AJAX form submission
        if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
            try:
                form = ProductOfferForm(request.POST, supplier=supplier)
                if form.is_valid():
                    offer = form.save(commit=False)
                    offer.created_by = request.user
                    offer.save()
                    
                    return JsonResponse({
                        'success': True,
                        'message': 'تم إضافة العرض بنجاح!',
                        'offer': {
                            'id': offer.id,
                            'product_name': offer.product.name,
                            'discount_percentage': f"{offer.get_discount_percentage_offer():.0f}%",
                            'price_after_discount': str(offer.get_price_with_discount()),
                            'from_date': offer.from_date.strftime('%Y-%m-%d'),
                            'to_date': offer.to_date.strftime('%Y-%m-%d')
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
            form = ProductOfferForm(request.POST, supplier=supplier)
            if form.is_valid():
                offer = form.save(commit=False)
                offer.created_by = request.user
                offer.save()
                messages.success(request, 'تم إضافة العرض بنجاح!')
                return redirect('my_merchant')
            else:
                messages.error(request, 'يرجى تصحيح الأخطاء في النموذج')
    
    else:
        form = ProductOfferForm(supplier=supplier)
    
    # Get products for this supplier that don't have active offers
    available_products = Product.objects.filter(
        supplier=supplier
    ).exclude(
        products_offer__is_active=True
    )
    
    context = {
        'form': form,
        'supplier': supplier,
        'available_products': available_products,
        'total_products': supplier.products.count()
    }
    
    # Return template for regular GET request
    return render(request, 'add_product_offer.html', context)
