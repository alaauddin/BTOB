from django.shortcuts import get_object_or_404
from django.http import JsonResponse
from django.contrib.auth.decorators import login_required
from django.views.decorators.http import require_POST
from core.models import Product, Supplier, ProductOffer

@login_required
@require_POST
def toggle_product_status(request, product_id):
    # Determine context (checking for superuser masquerade logic similar to edit/add)
    if request.user.is_superuser:
        product = get_object_or_404(Product, id=product_id)
    else:
        try:
            supplier = get_object_or_404(Supplier, user=request.user)
            product = get_object_or_404(Product, id=product_id, supplier=supplier)
        except:
             return JsonResponse({
                'success': False, 
                'message': 'Permission denied'
            }, status=403)

    try:
        # Toggle: Switch is_active status
        product.is_active = not product.is_active
        product.save()
        
        # If deactivating, also deactivate related offers
        if not product.is_active:
            ProductOffer.objects.filter(product=product).update(is_active=False)
        
        status_text = "تنشيط" if product.is_active else "تعطيل"
        return JsonResponse({
            'success': True,
            'message': f'تم {status_text} المنتج بنجاح',
            'is_active': product.is_active
        })
    except Exception as e:
        return JsonResponse({
            'success': False,
            'message': f'Error: {str(e)}'
        }, status=500)
