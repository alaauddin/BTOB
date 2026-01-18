import logging
import random
from urllib.parse import quote
from core.utils.whatsapp_utils import send_whatsapp_message

logger = logging.getLogger(__name__)

def complete_order_and_notify(request, order, cart, shipping_address, supplier):
    """Unified logic for finishing order, notifications, and clearing cart."""
    order.set_total_amount()
    
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
        send_whatsapp_message(shipping_address.phone, user_msg)
        
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
        send_whatsapp_message(supplier.phone, supp_msg)
        
        # 3. Platform Support Notification
        send_whatsapp_message("779923330", f"طلب جديد رقم #{order.id} من {supplier.name} لصالح العميل {shipping_address.phone}")
        
    except Exception as e:
        logger.error(f"Error sending order notifications: {str(e)}")

    # Clear Cart
    cart.cart_items.all().delete()
    
    # WhatsApp Redirection Info
    # Construct item list for WhatsApp message
    items_list = "\n".join([f"- {item.product.name} ({item.quantity})" for item in order.order_items.all()])
    wa_message = f"أريد طلبي من متجركم {supplier.name}\n\nقائمة أصناف الطلب:\n{items_list}"
    
    wa_url = f"https://wa.me/{supplier.phone}?text={quote(wa_message)}"
    
    return {
        'success': True,
        'message': 'تم اتمام الطلب بنجاح سيتواصل معك فريق العمليات لأتمام عملية الدفع',
        'order_id': order.id,
        'wa_url': wa_url,
        'supplier_phone': supplier.phone
    }
