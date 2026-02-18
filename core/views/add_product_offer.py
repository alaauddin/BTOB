from django.shortcuts import render, redirect, get_object_or_404
from django.http import JsonResponse
from django.contrib.auth.decorators import login_required
from core.decorators import merchant_required
from django.contrib import messages
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
import json

from core.forms import ProductOfferForm
from core.models import Supplier, Product, ProductOffer, PlatformOfferAd


@merchant_required
@require_http_methods(["GET", "POST"])
def add_product_offer(request):
    # Support superuser visiting via supplier_id query param
    if request.user.is_superuser and request.GET.get('supplier_id'):
        supplier_id = request.GET.get('supplier_id')
        supplier = get_object_or_404(Supplier, id=supplier_id)
    else:
        # Get the supplier for the current user
        supplier = getattr(request.user, 'supplier', None)
        
    if not supplier:
        if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
            return JsonResponse({
                'success': False, 
                'message': 'Supplier context missing'
            }, status=403)
        return redirect('suppliers_list')
    
    if request.method == 'POST':
        # Handle AJAX form submission
        if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
            try:
                form = ProductOfferForm(request.POST, supplier=supplier)
                if form.is_valid():
                    offer = form.save(commit=False)
                    offer.created_by = request.user
                    offer.save()
                    
                    # Automatically create PlatformOfferAd
                    PlatformOfferAd.objects.create(
                        product=offer.product,
                        description=f"عرض خاص: {offer.product.name} بسعر مخفض لفترة محدودة!",
                        start_date=offer.from_date,
                        end_date=offer.to_date,
                        is_approved=False
                    )
                    
                    return JsonResponse({
                        'success': True,
                        'message': 'تم إضافة العرض بنجاح! وتم إنشاء إعلان للمنصة بانتظار الموافقة.',
                        'offer': {
                            'id': offer.id,
                            'product_name': offer.product.name,
                            'discount_percentage': f"{offer.get_discount_percentage_offer():.0f}%" if hasattr(offer, 'get_discount_percentage_offer') else f"{offer.discount_precentage}%",
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
                
                # Automatically create PlatformOfferAd
                PlatformOfferAd.objects.create(
                    product=offer.product,
                    description=f"عرض خاص: {offer.product.name} بسعر مخفض لفترة محدودة!",
                    start_date=offer.from_date,
                    end_date=offer.to_date,
                    is_approved=False
                )

                messages.success(request, 'تم إضافة العرض وإعلان المنصة بنجاح! (بانتظار الموافقة)')
                next_url = request.GET.get('next')
                if next_url:
                    return redirect(next_url)
                if request.user.is_superuser:
                    return redirect(f'/my-merchant/?supplier_id={supplier.id}')
                return redirect('my_merchant')
            else:
                messages.error(request, 'يرجى تصحيح الأخطاء في النموذج')
    
    else:
        # Check for pre-selected product
        product_id = request.GET.get('product_id')
        initial_data = {}
        if product_id:
            try:
                # Verify product exists and belongs to supplier
                pre_selected_product = get_object_or_404(Product, id=product_id, supplier=supplier)
                initial_data['product'] = pre_selected_product
            except Exception:
                pass
        
        form = ProductOfferForm(supplier=supplier, initial=initial_data)
    
    # Get products for this supplier that don't have active offers
    # Also include the pre-selected product even if it has an offer, 
    # to avoid empty select when navigating via product_id
    available_products_query = Product.objects.filter(supplier=supplier)
    
    # If no product_id specified, exclude products with active (not expired) offers
    from django.utils import timezone
    today = timezone.now().date()
    
    if not request.GET.get('product_id'):
        available_products = available_products_query.exclude(
            products_offer__is_active=True,
            products_offer__to_date__gte=today
        )
    else:
        # If product_id specified, we want to show it, but still exclude others with active offers
        target_id = request.GET.get('product_id')
        import django.db.models as dj_models
        available_products = available_products_query.filter(
            dj_models.Q(id=target_id) | ~dj_models.Q(products_offer__is_active=True, products_offer__to_date__gte=today)
        ).distinct()
    
    context = {
        'form': form,
        'supplier': supplier,
        'available_products': available_products,
        'total_products': supplier.products.count(),
        'pre_selected_product': pre_selected_product if 'pre_selected_product' in locals() else None,
        'next': request.GET.get('next', '')
    }
    
    # Return template for regular GET request
    return render(request, 'add_product_offer.html', context)
