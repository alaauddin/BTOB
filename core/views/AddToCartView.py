from django.http import JsonResponse
from django.views import View
from django.shortcuts import get_object_or_404
from django.contrib.auth.decorators import login_required
from django.utils.decorators import method_decorator
from core.models import Cart, CartItem, Product

@method_decorator(login_required, name='dispatch')
class AddToCartView(View):
    def post(self, request, *args, **kwargs):
        product_id = request.POST.get('product_id')
        quantity = int(request.POST.get('quantity', 1))
        supplier_id = request.POST.get('supplier_id')

        product = get_object_or_404(Product, pk=product_id)
        user_cart, created = Cart.objects.get_or_create(user=request.user)

        # Check if the item is already in the cart
        cart_item, item_created = CartItem.objects.get_or_create(cart=user_cart, product=product)

        if not item_created:
            # If the item is already in the cart, update the quantity
            cart_item.quantity += quantity
            cart_item.save()
        else:
            # If the item is not in the cart, create a new cart item
            cart_item.quantity = quantity
            cart_item.save()

        return JsonResponse({'success': True})
