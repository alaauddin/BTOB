from django.shortcuts import render
from django.contrib.auth.decorators import login_required
from core.models import Order, Cart

def order_list_view(request):
    context = {}

    if request.user.is_authenticated:
        # try:
        #     user_cart = Cart.objects.get(user=request.user)
        # except Cart.DoesNotExist:
        #     user_cart = None

        orders = Order.objects.filter(user=request.user)
        # context['cart'] = user_cart
        context['orders'] = orders
    else:
        context['cart'] = None
        context['orders'] = None

    return render(request, 'order_list.html', context)
