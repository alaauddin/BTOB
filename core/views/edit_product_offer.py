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
def edit_product_offer(request, offer_id):
    try:
        # Get the offer first to identify the correct supplier
        offer = ProductOffer.objects.get(id=offer_id)
        
        # Check permissions
        if not request.user.is_superuser:
            supplier = Supplier.objects.get(user=request.user)
            if offer.product.supplier != supplier:
                raise PermissionError("You do not have permission to edit this offer")
        else:
            supplier = offer.product.supplier
            
    except (ProductOffer.DoesNotExist, Supplier.DoesNotExist):
        if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
            return JsonResponse({
                'success': False,
                'message': 'العرض غير موجود أو لا تملك صلاحية الوصول إليه'
            }, status=404)
        return redirect('my_merchant')
    except (PermissionError, Exception) as e:
        if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
            return JsonResponse({
                'success': False,
                'message': str(e)
            }, status=403 if isinstance(e, PermissionError) else 500)
        return redirect('my_merchant')
    
    if request.method == 'POST':
        # Handle AJAX form submission
        if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
            try:
                form = ProductOfferForm(request.POST, instance=offer, supplier=supplier)
                if form.is_valid():
                    updated_offer = form.save(commit=False)
                    updated_offer.created_by = request.user
                    updated_offer.save()
                    return JsonResponse({
                        'success': True,
                        'message': 'تم تحديث العرض بنجاح!',
                        'offer': {
                            'id': updated_offer.id,
                            'product_name': updated_offer.product.name,
                            'discount_percentage': f"{updated_offer.get_discount_percentage_offer():.0f}%",
                            'price_after_discount': str(updated_offer.get_price_with_discount()),
                            'from_date': updated_offer.from_date.strftime('%Y-%m-%d'),
                            'to_date': updated_offer.to_date.strftime('%Y-%m-%d'),
                            'is_active': updated_offer.is_active
                        }
                    })
                else:
                    # Return form errors
                    errors = {}
                    for field, error_list in form.errors.items():
                        if field == '__all__':
                            errors['general'] = error_list[0]
                        else:
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
        
        # Handle regular form submission
        else:
            form = ProductOfferForm(request.POST, instance=offer, supplier=supplier)
            if form.is_valid():
                updated_offer = form.save(commit=False)
                updated_offer.created_by = request.user
                updated_offer.save()
                messages.success(request, 'تم تحديث العرض بنجاح!')
                next_url = request.GET.get('next')
                if next_url:
                    return redirect(next_url)
                if request.user.is_superuser:
                    return redirect(f'/my-merchant/?supplier_id={supplier.id}')
                return redirect('my_merchant')
            else:
                messages.error(request, 'يرجى تصحيح الأخطاء في النموذج')
    
    else:
        form = ProductOfferForm(instance=offer, supplier=supplier)
    
    # Get all products for this supplier
    available_products = Product.objects.filter(supplier=supplier)
    
    context = {
        'form': form,
        'offer': offer,
        'supplier': supplier,
        'available_products': available_products,
        'is_edit': True,
        'next': request.GET.get('next', '')
    }
    
    return render(request, 'edit_product_offer.html', context)
