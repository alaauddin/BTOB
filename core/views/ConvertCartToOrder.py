from core.models import *
from django.shortcuts import render, redirect, get_object_or_404
from django.http import JsonResponse
import logging
import math
from decimal import Decimal
from django.contrib.auth.decorators import login_required
from core.forms import ShippingAddressForm
from django.contrib import messages
from core.utils.whatsapp_utils import send_whatsapp_message
from core.utils.order_utils import complete_order_and_notify
import random
from urllib.parse import quote

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
            
            spm_id = request.POST.get('payment_method_id')
            spm = None
            if spm_id and spm_id.isdigit():
                spm = SupplierPaymentMethod.objects.filter(id=spm_id, supplier=supplier).first()

            created_order = Order.objects.create(
                user=request.user, 
                total_amount=cart.get_total_after_discount(),
                delivery_fee=estimated_fee,
                selected_payment_method=spm
            )
            
            # Check if HasadPay was selected
            is_hasadpay = False
            if spm and spm.payment_method and ("hasadpay" in spm.payment_method.name.lower() or "حصاد باي" in spm.payment_method.name):
                is_hasadpay = True
            elif request.POST.get('is_hasadpay') == 'true' or spm_id == 'hasadpay':
                is_hasadpay = True

            # Handle Receipt Upload during Checkout (for manual transfer methods)
            receipt_file = request.FILES.get('receipt')
            if spm and receipt_file and not is_hasadpay:
                from core.models import PaymentTransaction
                PaymentTransaction.objects.create(
                    order=created_order,
                    user=request.user,
                    supplier_payment_method=spm,
                    receipt=receipt_file,
                    status='pending'
                )

            for cart_item in cart.cart_items.all():
                order_item = OrderItem.objects.create(
                    order=created_order, 
                    product=cart_item.product, 
                    quantity=cart_item.quantity,
                    price=cart_item.price or cart_item.product.price,
                    discount_price=cart_item.discount_price or cart_item.product.get_price_with_offer(),
                    price_modifier_total=cart_item.price_modifier_total or cart_item.get_options_price_modifier()
                )
                if cart_item.selected_options.exists():
                    order_item.selected_options.set(cart_item.selected_options.all())
            
            address.order = created_order
            address.save()

            if is_hasadpay:
                try:
                    from core.views.hasadpay_views import create_hasadpay_checkout_session
                    checkout_url = create_hasadpay_checkout_session(request, created_order, supplier)
                    cart.cart_items.all().delete()
                    if request.headers.get('x-requested-with') == 'XMLHttpRequest':
                        return JsonResponse({
                            'success': True,
                            'is_hasadpay': True,
                            'redirect_url': checkout_url,
                            'checkout_url': checkout_url,
                            'order_id': created_order.id
                        })
                    return redirect(checkout_url)
                except Exception as e:
                    logger.error(f"HasadPay checkout creation failed: {str(e)}", exc_info=True)
                    created_order.delete()
                    if request.headers.get('x-requested-with') == 'XMLHttpRequest':
                        return JsonResponse({
                            'success': False,
                            'message': f'تعذر إنشاء جلسة الدفع الإلكتروني عبر حصاد باي: {str(e)}'
                        }, status=400)
                    messages.error(request, f'تعذر إنشاء جلسة الدفع الإلكتروني عبر حصاد باي: {str(e)}')
                    return redirect('store_cart', store_id=supplier.store_id)
            
            result = complete_order_and_notify(request, created_order, cart, address, supplier, payment_method_id=spm_id)
            
            if request.headers.get('x-requested-with') == 'XMLHttpRequest':
                return JsonResponse(result)
            
            messages.success(request, result['message'])
            return redirect('order_detail', pk=created_order.id)
        else:
            if request.headers.get('x-requested-with') == 'XMLHttpRequest':
                return JsonResponse({
                    'success': False, 
                    'message': 'يرجى تصحيح الأخطاء في البيانات المدخلة',
                    'errors': form.errors
                }, status=400)
    else:
        form = ShippingAddressForm()
 
    # Get available payment methods for the supplier
    payment_methods = supplier.payment_methods.filter(is_active=True).select_related('payment_method')

    return render(request, 'checkout_select_address_or_custom_address.html', {
        'form': form ,
        'cart': cart, 
        'order': order, 
        'order_items': order_items, 
        'user_address': user_address, 
        'supplier': supplier,
        'estimated_fee': estimated_fee,
        'estimated_distance': estimated_distance,
        'payment_methods': payment_methods
    })

  
  
  
def existing_address(request, store_id):
    supplier = get_object_or_404(Supplier, store_id=store_id)
    cart = Cart.objects.get(user=request.user, supplier=supplier) 
    spm_id = request.POST.get('payment_method_id') or request.GET.get('payment_method_id')
    spm = None
    if spm_id and str(spm_id).isdigit():
        spm = SupplierPaymentMethod.objects.filter(id=int(spm_id), supplier=supplier).first()

    # Check if HasadPay was selected
    is_hasadpay = False
    if spm and spm.payment_method and ("hasadpay" in spm.payment_method.name.lower() or "حصاد باي" in spm.payment_method.name):
        is_hasadpay = True
    elif request.POST.get('is_hasadpay') == 'true' or spm_id == 'hasadpay':
        is_hasadpay = True

    order = Order.objects.create(
        user=request.user, 
        total_amount=cart.get_total_after_discount(),
        delivery_fee=Decimal('0'), # Will be updated below
        selected_payment_method=spm
    )
    
    # Handle Receipt Upload during Checkout
    receipt_file = request.FILES.get('receipt')
    if spm and receipt_file and not is_hasadpay:
        from core.models import PaymentTransaction
        PaymentTransaction.objects.create(
            order=order,
            user=request.user,
            supplier_payment_method=spm,
            receipt=receipt_file,
            status='pending'
        )
    for cart_item in cart.cart_items.all():
        order_item = OrderItem.objects.create(
            order=order, 
            product=cart_item.product, 
            quantity=cart_item.quantity,
            price=cart_item.price or cart_item.product.price,
            discount_price=cart_item.discount_price or cart_item.product.get_price_with_offer(),
            price_modifier_total=cart_item.price_modifier_total or cart_item.get_options_price_modifier()
        )
        if cart_item.selected_options.exists():
            order_item.selected_options.set(cart_item.selected_options.all())

    user_address = Address.objects.get(user = request.user)

    logger.info(user_address)
    # Use address phone if available, otherwise fall back to user's account phone
    address_phone = user_address.phone or getattr(request.user, 'phone_number', None)

    shipping_address = ShippingAddress.objects.create(
        order = order,
        phone = address_phone,
        address_line1 = user_address.address_line1,
        address_line2 = user_address.address_line2,
        city = user_address.city,
        country = user_address.country,
        postal_code = user_address.postal_code,
        address_type = user_address.address_type,
        latitude = user_address.latitude,
        longitude = user_address.longitude
    )
    
    # Recalculate distance and fee for existing address
    order.delivery_fee = order.get_expected_delivery_fee()
    order.total_amount = cart.get_total_after_discount() + order.delivery_fee
    order.save()

    if is_hasadpay:
        try:
            from core.views.hasadpay_views import create_hasadpay_checkout_session
            checkout_url = create_hasadpay_checkout_session(request, order, supplier)
            cart.cart_items.all().delete()
            if request.headers.get('x-requested-with') == 'XMLHttpRequest':
                return JsonResponse({
                    'success': True,
                    'is_hasadpay': True,
                    'redirect_url': checkout_url,
                    'checkout_url': checkout_url,
                    'order_id': order.id
                })
            return redirect(checkout_url)
        except Exception as e:
            logger.error(f"HasadPay checkout creation failed: {str(e)}", exc_info=True)
            order.delete()
            if request.headers.get('x-requested-with') == 'XMLHttpRequest':
                return JsonResponse({
                    'success': False,
                    'message': f'تعذر إنشاء جلسة الدفع الإلكتروني عبر حصاد باي: {str(e)}'
                }, status=400)
            messages.error(request, f'تعذر إنشاء جلسة الدفع الإلكتروني عبر حصاد باي: {str(e)}')
            return redirect('store_cart', store_id=supplier.store_id)

    result = complete_order_and_notify(request, order, cart, shipping_address, supplier, payment_method_id=spm_id)
    
    if request.headers.get('x-requested-with') == 'XMLHttpRequest':
        return JsonResponse(result)
        
    messages.success(request, result['message'])
    return redirect(result['wa_url'])

  
  
  
  
  
  
  

