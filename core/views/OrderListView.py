from django.shortcuts import render
from django.contrib.auth.decorators import login_required
from core.models import Order, Cart


@login_required
def order_list_view(request):
    orders = Order.objects.filter(user=request.user)
    context = {
        'orders': orders,
    }        

    return render(request, 'order_list.html', context)
