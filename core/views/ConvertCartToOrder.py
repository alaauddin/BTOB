from core.models import *
from django.shortcuts import render, redirect, get_object_or_404
import logging
import math
from decimal import Decimal
from django.contrib.auth.decorators import login_required
from core.forms import ShippingAddressForm
from django.contrib import messages
from core.utils.whatsapp_utils import send_whatsapp_message

logger = logging.getLogger(__name__)





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
            
            # Send Notifications
            try:
                supplier = created_order.get_supplier()
                total = created_order.get_total_after_discount()
                domain = request.get_host()
                
                # 1. User Notification
                user_msg = (
                    f"شكراً لثقتك بنا! 🎉 تم استلام طلبك بنجاح من متجر {supplier.name}.\n"
                    f"نحن فخورون بخدمتك ونسعى دائماً لتوفير الأفضل لك.\n"
                    f"إجمالي الطلب: {total} {supplier.currency}\n"
                    f"للمزيد من العروض الرائعة، زورونا دائماً: https://{domain}\n"
                    f"في خدمتك دائماً، الدعم الفني: 779923330"
                )
                send_whatsapp_message(address.phone, user_msg)
                
                # 2. Supplier Notification
                shipping = address
                location_link = f"https://www.google.com/maps?q={shipping.latitude},{shipping.longitude}" if shipping.latitude and shipping.longitude else "غير متوفر"
                supp_msg = (
                    f"طلب جديد رقم #{created_order.id}\n"
                    f"العميل: {request.user.get_full_name() or request.user.username}\n"
                    f"رقم العميل: {shipping.phone}\n"
                    f"الموقع: {location_link}\n"
                    f"ملاحظات: {shipping.address_line2 or 'لا يوجد'}\n"
                    f"رابط الطلب: https://{domain}/merchant-order/{created_order.id}/"
                )
                send_whatsapp_message(supplier.phone, supp_msg)
                
                # 3. Platform Support Notification
                send_whatsapp_message("779923330", f"طلب جديد رقم #{created_order.id} من {supplier.name} لصالح العميل {shipping.phone}")
                
            except Exception as e:
                logger.error(f"Error sending order notifications: {str(e)}")

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

    logger.info(user_address)
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
    
    # Send Notifications
    try:
        supplier = order.get_supplier()
        total = order.get_total_after_discount()
        domain = request.get_host()
        
        # 1. User Notification
        user_msg = (
            f"تم استلام طلبك بنجاح من {supplier.name}!\n"
            f"إجمالي الطلب: {total} {supplier.currency}\n"
            f"رابط الموقع: https://{domain}\n"
            f"للدعم الفني: 779923330"
        )
        send_whatsapp_message(shipping_address.phone, user_msg)
        
        # 2. Supplier Notification
        location_link = f"https://www.google.com/maps?q={shipping_address.latitude},{shipping_address.longitude}" if shipping_address.latitude and shipping_address.longitude else "غير متوفر"
        supp_msg = (
            f"طلب جديد رقم #{order.id}\n"
            f"العميل: {request.user.get_full_name() or request.user.username}\n"
            f"رقم العميل: {shipping_address.phone}\n"
            f"الموقع: {location_link}\n"
            f"ملاحظات: {shipping_address.address_line2 or 'لا يوجد'}\n"
            f"رابط الطلب: https://{domain}/merchant-order/{order.id}/"
        )
        send_whatsapp_message(supplier.phone, supp_msg)
        
        # 3. Platform Support Notification
        send_whatsapp_message("779923330", f"طلب جديد رقم #{order.id} من {supplier.name} لصالح العميل {shipping_address.phone}")
        
    except Exception as e:
        logger.error(f"Error sending order notifications: {str(e)}")

    cart.cart_items.all().delete()
    messages.success(request, 'تم اتمام الطلب بنجاح سيتواصل معك فريق العمليات لأتمام عملية الدفع')
    return redirect('product-list', store_id=store_id)

  
  
  
  
  
  
  

