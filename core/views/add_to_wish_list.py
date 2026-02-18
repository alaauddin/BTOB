
from django.http import JsonResponse
from django.contrib.auth.decorators import login_required
from django.views.decorators.http import require_POST
from django.shortcuts import get_object_or_404
from core.models import Product, WishList
import json


@login_required
@require_POST
def toggle_wishlist(request, product_id):
    """Toggle product in user's wishlist"""
    try:
        product = get_object_or_404(Product, id=product_id)
        wishlist_item, created = WishList.objects.get_or_create(
            user=request.user, 
            product=product
        )
        
        if created:
            # Item was added to wishlist
            return JsonResponse({
                'success': True,
                'action': 'added',
                'message': 'تم إضافة المنتج للمفضلة',
                'in_wishlist': True
            })
        else:
            # Item was already in wishlist, so remove it
            wishlist_item.delete()
            return JsonResponse({
                'success': True,
                'action': 'removed',
                'message': 'تم إزالة المنتج من المفضلة',
                'in_wishlist': False
            })
            
    except Exception as e:
        return JsonResponse({
            'success': False,
            'message': 'حدث خطأ أثناء تحديث المفضلة'
        }, status=500)


@login_required
def get_wishlist_status(request, product_id):
    """Check if product is in user's wishlist"""
    try:
        product = get_object_or_404(Product, id=product_id)
        in_wishlist = WishList.objects.filter(
            user=request.user, 
            product=product
        ).exists()
        
        return JsonResponse({
            'success': True,
            'in_wishlist': in_wishlist
        })
        
    except Exception as e:
        return JsonResponse({
            'success': False,
            'message': 'حدث خطأ أثناء التحقق من حالة المفضلة'
        }, status=500)


@login_required
def get_all_wishlist_status(request):
    """Return all product IDs in user's wishlist"""
    try:
        wishlist_ids = list(WishList.objects.filter(user=request.user).values_list('product_id', flat=True))
        return JsonResponse({
            'success': True,
            'ids': wishlist_ids
        })
    except Exception as e:
        return JsonResponse({
            'success': False,
            'message': 'Error fetching wishlist status'
        }, status=500)