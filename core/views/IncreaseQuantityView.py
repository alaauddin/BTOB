from django.http import JsonResponse
from django.views import View
from django.shortcuts import get_object_or_404
from django.contrib.auth.decorators import login_required
from django.utils.decorators import method_decorator
from core.models import Cart, CartItem

@method_decorator(login_required, name='dispatch')
class IncreaseQuantityView(View):
    def post(self, request, *args, **kwargs):
        item_id = kwargs.get('item_id')
        cart_item = get_object_or_404(CartItem, pk=item_id, cart__user=request.user)

        # Implement the logic to increase the quantity
        cart_item.quantity += 1
        cart_item.save()

        return JsonResponse({'success': True})
