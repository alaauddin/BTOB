from django.shortcuts import get_object_or_404
from django.http import JsonResponse
from django.contrib.auth.decorators import login_required
from django.views.decorators.http import require_POST
from core.models import Product, Supplier, ProductOffer

@login_required
@require_POST
def delete_product(request, product_id):
    # Determine context (checking for superuser masquerade logic similar to edit/add)
    # However, for safety, we generally check ownership unless superuser
    
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
        # Soft delete: Set is_active to False
        product.is_active = False
        product.save()
        
        # Deactivate related offers
        ProductOffer.objects.filter(product=product).update(is_active=False)
        
        return JsonResponse({
            'success': True,
            'message': 'تم حذف المنتج بنجاح (نقل إلى المهملات)'
        })
    except Exception as e:
        return JsonResponse({
            'success': False,
            'message': f'Error: {str(e)}'
        }, status=500)
