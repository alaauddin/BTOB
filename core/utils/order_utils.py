import logging
import random
from urllib.parse import quote
from core.utils.whatsapp_utils import send_whatsapp_message

logger = logging.getLogger(__name__)

def complete_order_and_notify(request, order, cart, shipping_address, supplier, payment_method_id=None, receipt=None):
    """Unified logic for finishing order, notifications, and clearing cart."""
    order.set_total_amount()

    # Create Payment Transaction if applicable
    if payment_method_id:
        from core.models import SupplierPaymentMethod, PaymentTransaction, PaymentMethod
        try:
            is_system_default = request.POST.get('is_system_default_payment') == 'true'
            
            if is_system_default:
                # Handle platform defaults like COD (payment_method_id is the global ID)
                global_method = PaymentMethod.objects.get(id=payment_method_id)
                # Try to find if the supplier HAS configured it
                supp_payment = SupplierPaymentMethod.objects.filter(supplier=supplier, payment_method=global_method).first()
                
                PaymentTransaction.objects.create(
                    order=order,
                    user=request.user,
                    payment_method=global_method,
                    supplier_payment_method=supp_payment,
                    receipt=receipt,
                    status='verified' if not global_method.requires_proof else 'pending'
                )
            else:
                supp_payment = SupplierPaymentMethod.objects.get(id=payment_method_id, supplier=supplier)
                PaymentTransaction.objects.create(
                    order=order,
                    user=request.user,
                    payment_method=supp_payment.payment_method,
                    supplier_payment_method=supp_payment,
                    receipt=receipt,
                    status='pending' if supp_payment.payment_method.requires_proof else 'verified'
                )
        except (SupplierPaymentMethod.DoesNotExist, PaymentMethod.DoesNotExist):
            logger.error(f"PaymentMethod {payment_method_id} not found (is_system={is_system_default})")
    
    # Send Notifications
    try:
        total = order.get_total_after_discount()
        domain = request.get_host()
        
        # 1. User Notification
        user_msg = (
            f"شكراً لثقتك بنا! 🎉 تم استلام طلبك بنجاح من متجر {supplier.name}.\n"
            f"نحن فخورون بخدمتك ونسعى دائماً لتوفير الأفضل لك.\n"
            f"إجمالي الطلب: {total} {supplier.currency}\n"
            f"للمزيد من العروض الرائعة، زورونا دائماً: https://{domain}\n"
            f"في خدمتك دائماً، الدعم الفني: 779923330"
        )
        logger.info(f"[WhatsApp] Sending user notification to phone: '{shipping_address.phone}'")
        send_whatsapp_message(str(shipping_address.phone), str(user_msg))
        
        # 2. Supplier Notification
        location_link = f"https://www.google.com/maps?q={shipping_address.latitude},{shipping_address.longitude}" if shipping_address.latitude and shipping_address.longitude else "غير متوفر"
        
        # Try to get customer name
        full_name = request.POST.get('full_name', '').strip()
        customer_name = full_name if full_name else (request.user.get_full_name() or request.user.username)
        
        supp_msg = (
            f"طلب جديد رقم #{order.id}\n"
            f"العميل: {customer_name}\n"
            f"رقم العميل: {shipping_address.phone}\n"
            f"الموقع: {location_link}\n"
            f"ملاحظات: {shipping_address.address_line2 or 'لا يوجد'}\n"
            f"رابط الطلب: https://{domain}/merchant-order/{order.id}/"
        )
        send_whatsapp_message(str(supplier.phone), str(supp_msg))
        
        # 3. Platform Support Notification
        send_whatsapp_message("779923330", f"طلب جديد رقم #{order.id} من {supplier.name} لصالح العميل {shipping_address.phone}")
        
    except Exception as e:
        logger.error(f"Error sending order notifications: {str(e)}")

    # Clear Cart
    cart.cart_items.all().delete()
    
    # WhatsApp Redirection Info
    # Construct item list for WhatsApp message
    items_lines = []
    for item in order.order_items.all():
        options_text = ""
        # Assuming we can access selected_options from the through model since order_items is a M2M
        # But wait, order_items is actually related_name on OrderItem for Order
        # Let's verify the relationship in core/db/order.py:
        # related_name='order_items' on OrderItem.order
        
        # Check if this item has selected options
        if item.selected_options.exists():
            opts = ", ".join([f"{o.attribute.name}: {o.value}" for o in item.selected_options.all()])
            options_text = f" [{opts}]"
        
        items_lines.append(f"- {item.product.name}{options_text} ({item.quantity})")
    
    items_list = "\n".join(items_lines)
    wa_message = f"أريد طلبي من متجركم {supplier.name}\n\nقائمة أصناف الطلب:\n{items_list}"
    
    wa_url = f"https://wa.me/{supplier.phone}?text={quote(wa_message)}"
    
    # Determine Message based on payment
    # Determine Message based on payment
    tx = getattr(order, 'payment_transaction', None)
    if not tx:
        msg = 'تم اتمام الطلب بنجاح سيتواصل معك فريق العمليات لأتمام عملية الدفع'
    elif tx.payment_method and tx.payment_method.id == 3: # COD
        msg = 'تم استلام طلبك بنجاح! خيار الدفع: عند استلام الطلبات.'
    else:
        msg = 'تم اتمام الطلب وإرفاق الإيصال بنجاح! سيتم التحقق منه قريباً.'

    return {
        'success': True,
        'message': msg,
        'order_id': order.id,
        'wa_url': wa_url,
        'supplier_phone': supplier.phone
    }
