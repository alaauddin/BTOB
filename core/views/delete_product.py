from django.shortcuts import get_object_or_404
from django.http import JsonResponse
from django.contrib.auth.decorators import login_required
from django.views.decorators.http import require_POST
from core.models import Product, Supplier, ProductOffer

@login_required
@require_POST
def toggle_product_status(request, product_id):
    try:
        # Determine context
        if request.user.is_superuser:
            product = Product.objects.get(id=product_id)
        else:
            supplier = Supplier.objects.get(user=request.user)
            product = Product.objects.get(id=product_id, supplier=supplier)

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
    except (Product.DoesNotExist, Supplier.DoesNotExist):
        return JsonResponse({
            'success': False,
            'message': 'المنتج غير موجود أو لا تملك صلاحية الوصول إليه'
        }, status=404)
    except Exception as e:
        return JsonResponse({
            'success': False,
            'message': f'حدث خطأ: {str(e)}'
        }, status=500)
