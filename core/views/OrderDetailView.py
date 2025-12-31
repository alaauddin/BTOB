from core.models import Order, Cart
from django.shortcuts import render, get_object_or_404
from django.contrib.auth.decorators import login_required

@login_required
def order_detail_view(request, pk):
    order = get_object_or_404(Order, pk=pk)
    supplier = order.get_supplier()
    print(supplier)
    cart = Cart.objects.get(user=request.user, supplier=supplier)



    context = {
        'order': order,
        'cart': cart,
        'supplier': supplier,
    }
    return render(request, 'order_detail.html', context)
