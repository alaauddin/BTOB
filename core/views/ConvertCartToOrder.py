from core.models import *
from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required
from core.forms import ShippingAddressForm





@login_required
def checkout_select_address_or_custom_address(request,supplier_id):
    supplier = Supplier.objects.get(pk=supplier_id)
    cart = Cart.objects.get(user=request.user, supplier_id=supplier_id)
    
    order = cart
    # for cart_item in cart.cartitem_set.all():
    order_items = CartItem.objects.filter(cart=order)
    user_address = Address.objects.filter(user=request.user).first()



    if request.method == 'POST':
        form = ShippingAddressForm(request.POST)
        if form.is_valid():           
            address = form.save(commit=False)
            
            created_order = Order.objects.create(user=request.user, total_amount=cart.get_total_amount())
            for cart_item in cart.cart_items.all():
                OrderItem.objects.create(order=created_order
                , product=cart_item.product, quantity=cart_item.quantity)
            
            cart.cart_items.all().delete()
            address.order = created_order
            address.save()
            return redirect('order_detail', pk=created_order.id)
    else:
        form = ShippingAddressForm()
 
    return render(request, 'checkout_select_address_or_custom_address.html', {'form': form ,'cart': cart, 'order': order, 'order_items': order_items, 'user_address': user_address, 'supplier': supplier})

  
  
  
def existing_address(request, supplier_id):
    cart = Cart.objects.get(user=request.user, supplier_id=supplier_id) 
    order = Order.objects.create(user=request.user, total_amount=cart.get_total_amount())
    for cart_item in cart.cart_items.all():
        OrderItem.objects.create(order=order, product=cart_item.product, quantity=cart_item.quantity)

    user_address = Address.objects.get(user = request.user)

    print(user_address)
    shipping_address = ShippingAddress.objects.create(
        order = order,
        phone = user_address.phone,
        address_line1 = user_address.address_line1,
        address_line2 = user_address.address_line2,
        city = user_address.city,
        country = user_address.country,
        postal_code = user_address.postal_code,
        address_type = user_address.address_type

    )
    cart.cart_items.all().delete()
    return redirect('order_detail', pk=order.id)

  
  
  
  
  
  
  

