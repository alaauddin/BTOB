from core.models import *
from django.shortcuts import render, redirect
import math
from decimal import Decimal
from django.contrib.auth.decorators import login_required
from core.forms import ShippingAddressForm
from django.contrib import messages





@login_required
def checkout_select_address_or_custom_address(request, store_id):
    supplier = get_object_or_404(Supplier, store_id=store_id)
    cart = Cart.objects.get(user=request.user, supplier=supplier)
    
    order = cart
    # for cart_item in cart.cartitem_set.all():
    order_items = CartItem.objects.filter(cart=order)
    user_address = Address.objects.filter(user=request.user).first()
    
    # Calculate estimated fee for registered address
    estimated_fee = Decimal('0')
    estimated_distance = None
    if supplier.enable_delivery_fees and user_address and user_address.latitude and user_address.longitude and supplier.latitude and supplier.longitude:
        # We can use the logic from Order here too if we want, but since we don't have an order yet:
        R = 6371
        phi1, phi2 = math.radians(float(supplier.latitude)), math.radians(float(user_address.latitude))
        dphi = math.radians(float(user_address.latitude) - float(supplier.latitude))
        dlambda = math.radians(float(user_address.longitude) - float(supplier.longitude))
        a = math.sin(dphi / 2)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2)**2
        estimated_distance = R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        fee = float(estimated_distance) * float(supplier.delivery_fee_ratio or 0)
        estimated_fee = Decimal(str(fee)).quantize(Decimal('0.01'))



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
            
            # Recalculate total with delivery fee if enabled
            created_order.set_total_amount()
            
            return redirect('order_detail', pk=created_order.id)
    else:
        form = ShippingAddressForm()
 
    return render(request, 'checkout_select_address_or_custom_address.html', {
        'form': form ,
        'cart': cart, 
        'order': order, 
        'order_items': order_items, 
        'user_address': user_address, 
        'supplier': supplier,
        'estimated_fee': estimated_fee,
        'estimated_distance': estimated_distance
    })

  
  
  
def existing_address(request, store_id):
    supplier = get_object_or_404(Supplier, store_id=store_id)
    cart = Cart.objects.get(user=request.user, supplier=supplier) 
    order = Order.objects.create(user=request.user, total_amount=cart.get_total_after_discount())
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
        address_type = user_address.address_type,
        latitude = user_address.latitude,
        longitude = user_address.longitude
    )
    
    # Recalculate total with delivery fee if enabled
    order.set_total_amount()
    cart.cart_items.all().delete()
    messages.success(request, 'تم اتمام الطلب بنجاح سيتواصل معك فريق العمليات لأتمام عملية الدفع')
    return redirect('product-list', store_id=store_id)

  
  
  
  
  
  
  

