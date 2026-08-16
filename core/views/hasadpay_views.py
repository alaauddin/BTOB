import json
import logging
from decimal import Decimal
from urllib.parse import quote

from django.shortcuts import render, get_object_or_404, redirect
from django.contrib.auth.decorators import login_required
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST
from django.http import JsonResponse, HttpResponse
from django.contrib import messages
from django.utils import timezone
from django.urls import reverse

from core.models import (
    Supplier,
    SupplierHasadPayConfig,
    HasadPayTransaction,
    PaymentMethod,
    SupplierPaymentMethod,
    Order,
    OrderStatus,
    OrderPaymentReference,
)
from core.forms import SupplierHasadPayConfigForm
from core.utils.merchant_utils import get_active_supplier
from core.utils.whatsapp_utils import send_whatsapp_message

logger = logging.getLogger(__name__)

HASADPAY_GLOBAL_METHOD_NAME = "حصاد باي - الدفع الإلكتروني المباشر (محافظ وبطاقات)"


def get_or_create_hasadpay_payment_method():
    """Ensure the global PaymentMethod for HasadPay exists in the database."""
    method = PaymentMethod.objects.filter(name__icontains="حصاد باي").first()
    if not method:
        method = PaymentMethod.objects.create(
            name=HASADPAY_GLOBAL_METHOD_NAME,
            requires_proof=False,
            is_active=True,
        )
    return method


@login_required
def manage_hasadpay_settings(request):
    """View for merchants to configure their HasadPay API credentials & settings."""
    supplier = get_active_supplier(request)
    if not supplier:
        messages.error(request, 'غير مصرح بالدخول.')
        return redirect('suppliers_list')

    config, _ = SupplierHasadPayConfig.objects.get_or_create(supplier=supplier)

    if request.method == 'POST':
        form = SupplierHasadPayConfigForm(request.POST, instance=config)
        if form.is_valid():
            saved_config = form.save()

            # Synchronize with SupplierPaymentMethod so HasadPay appears in the checkout
            global_pm = get_or_create_hasadpay_payment_method()
            spm, _ = SupplierPaymentMethod.objects.get_or_create(
                supplier=supplier,
                payment_method=global_pm,
                defaults={
                    'account_field_name': 'بوابة حصاد باي',
                    'account_field_value': saved_config.display_name or 'دفع إلكتروني فوري',
                    'is_active': saved_config.is_enabled,
                }
            )
            spm.is_active = saved_config.is_enabled
            spm.account_field_value = saved_config.display_name or 'دفع إلكتروني فوري'
            spm.save()

            messages.success(request, 'تم حفظ إعدادات بوابة حصاد باي بنجاح.')
            return redirect('manage_hasadpay_settings')
    else:
        form = SupplierHasadPayConfigForm(instance=config)

    webhook_url = config.get_webhook_url(request)

    return render(request, 'hasadpay_settings.html', {
        'supplier': supplier,
        'config': config,
        'form': form,
        'webhook_url': webhook_url,
    })


@login_required
@require_POST
def test_hasadpay_connection(request):
    """AJAX endpoint to test HasadPay credentials against the gateway API."""
    supplier = get_active_supplier(request)
    if not supplier:
        return JsonResponse({'success': False, 'message': 'غير مصرح بالدخول.'}, status=403)

    api_key = request.POST.get('api_key', '').strip()
    entity_id = request.POST.get('entity_id', '').strip() or None
    webhook_secret = request.POST.get('webhook_secret', '').strip() or None
    environment = request.POST.get('environment', 'production')
    custom_base_url = request.POST.get('custom_base_url', '').strip() or None

    if not api_key:
        config = getattr(supplier, 'hasadpay_config', None)
        if config and config.api_key:
            api_key = config.api_key
            entity_id = entity_id or config.entity_id
            webhook_secret = webhook_secret or config.webhook_secret
            environment = environment or config.environment
            custom_base_url = custom_base_url or config.custom_base_url

    if not api_key:
        return JsonResponse({
            'success': False,
            'message': 'يرجى إدخال مفتاح API Key أولاً لإجراء الفحص.'
        }, status=400)

    try:
        from hasadpay import HasadPayClient, Environment, HasadPayAuthError, HasadPayAPIError
        from django.conf import settings

        default_base_url = getattr(settings, 'HASADPAY_BASE_URL', 'https://merchent-local.fintechsys.net')
        base_url = custom_base_url or default_base_url

        client = HasadPayClient(
            api_key=api_key,
            entity_id=entity_id,
            webhook_secret=webhook_secret,
            base_url=base_url,
            timeout=15.0,
        )

        # Query dynamic payment methods to verify connectivity and authentication
        methods = client.methods.get_available_methods(categorized=False)
        method_names = [f"{m.name} ({m.code})" for m in methods[:5]]

        return JsonResponse({
            'success': True,
            'message': f'تم الاتصال بنجاح مع بوابة حصاد باي ({environment})!',
            'methods_count': len(methods),
            'sample_methods': method_names,
        })
    except ImportError:
        return JsonResponse({
            'success': False,
            'message': 'حزمة HasadPay SDK غير مثبتة في الخادم.'
        }, status=500)
    except Exception as e:
        logger.error(f"HasadPay test connection error: {str(e)}", exc_info=True)
        return JsonResponse({
            'success': False,
            'message': f'فشل الاتصال بالبوابة: {str(e)}'
        }, status=400)


def create_hasadpay_checkout_session(request, order, supplier):
    """Creates a hosted checkout transaction session on HasadPay and returns the redirect URL."""
    config = getattr(supplier, 'hasadpay_config', None)
    if not config or not config.is_enabled or not config.api_key:
        raise ValueError("بوابة حصاد باي غير مفعلة لهذا المتجر أو لم يتم إدخال مفاتيح الربط.")

    client = config.get_client()
    if not client:
        raise ValueError("تعذر تهيئة عميل حصadPay.")

    currency_code = supplier.currency.code if supplier.currency else 'YER'
    total_amount = str(order.total_amount)

    # Resolve customer information
    shipping_address = order.shippingaddress_set.first()
    customer_phone = str(shipping_address.phone) if shipping_address and shipping_address.phone else ""
    customer_name = request.user.get_full_name() or request.user.username

    # Format return URL
    return_url = request.build_absolute_uri(
        reverse('hasadpay_return_callback', kwargs={'order_id': order.id})
    )

    # Format items payload
    items = []
    for item in order.order_items.all():
        items.append({
            'id': item.product.id,
            'name': item.product.name,
            'price': str(item.get_unit_price_with_discount()),
            'quantity': item.quantity,
        })

    order_ref = f"ORD-{order.id}"

    try:
        from hasadpay import Currency

        # Map ISO string to Currency enum if available
        try:
            curr_enum = getattr(Currency, currency_code, Currency.YER)
        except Exception:
            curr_enum = currency_code

        tx_response = client.transactions.create(
            amount=total_amount,
            currency=curr_enum,
            mobile_number=customer_phone,
            name=customer_name,
            request_refrence=order_ref,
            return_url=return_url,
            note=f"طلب #{order.id} من متجر {supplier.name}",
            items=items if items else None,
        )

        checkout_url = tx_response.checkout_url
        from django.conf import settings
        default_base_url = getattr(settings, 'HASADPAY_BASE_URL', 'https://merchent-local.fintechsys.net').rstrip('/')
        base = ( default_base_url).rstrip('/')

        if not checkout_url and tx_response.uuid:
            checkout_url = f"{base}/checkout/?id={tx_response.uuid}"
        elif checkout_url and not (checkout_url.startswith('http://') or checkout_url.startswith('https://')):
            checkout_url = f"{base}/{checkout_url.lstrip('/')}"

        # Record or update transaction in local database
        tx_obj, _ = HasadPayTransaction.objects.update_or_create(
            order=order,
            defaults={
                'supplier': supplier,
                'transaction_id': str(tx_response.id) if tx_response.id else None,
                'transaction_uuid': str(tx_response.uuid) if tx_response.uuid else None,
                'amount': Decimal(total_amount),
                'currency': currency_code,
                'status': 'pending',
                'status_code': tx_response.status_code or '',
                'status_display': tx_response.status_display or 'In Progress',
                'checkout_url': checkout_url,
                'customer_phone': customer_phone,
                'customer_name': customer_name,
                'raw_response': {
                    'id': tx_response.id,
                    'uuid': tx_response.uuid,
                    'checkout_url': checkout_url,
                    'status': tx_response.status,
                    'status_code': tx_response.status_code,
                    'status_display': tx_response.status_display,
                }
            }
        )

        return checkout_url

    except Exception as e:
        logger.error(f"Error creating HasadPay checkout session for Order #{order.id}: {str(e)}", exc_info=True)
        raise e


def hasadpay_return_callback(request, order_id):
    """Customer return landing page after interacting with HasadPay payment gateway."""
    order = get_object_or_404(Order, id=order_id)
    tx = getattr(order, 'hasadpay_transaction', None)
    supplier = order.get_supplier() or (tx.supplier if tx else None)
    config = getattr(supplier, 'hasadpay_config', None) if supplier else None

    # Query gateway for live status if possible
    is_success = False
    status_display = "قيد المعالجة"

    if config and tx and (tx.transaction_uuid or tx.transaction_id):
        client = config.get_client()
        if client:
            try:
                gateway_status = client.transactions.get(transaction_id=tx.transaction_uuid or tx.transaction_id)
                tx.status_code = gateway_status.status_code or tx.status_code
                tx.status_display = gateway_status.status_display or tx.status_display
                status_display = gateway_status.status_display or status_display

                if gateway_status.is_successful:
                    is_success = True
                    tx.status = 'paid'
                    tx.paid_at = timezone.now()
                    tx.service = gateway_status.service or tx.service
                    tx.service_name = gateway_status.service_name or tx.service_name

                    # Record payment reference idempotently
                    ref_number = f"HP-{gateway_status.id or tx.transaction_uuid}"
                    if not OrderPaymentReference.objects.filter(order=order, reference_number=ref_number).exists():
                        OrderPaymentReference.objects.create(
                            order=order,
                            amount=order.total_amount,
                            reference_number=ref_number,
                            recorded_by=order.user
                        )

                    # Auto-confirm order if configured
                    if config.auto_confirm_order:
                        confirmed_status = OrderStatus.objects.filter(slug='confirmed').first()
                        if confirmed_status and order.pipeline_status != confirmed_status:
                            order.update_status(confirmed_status, user=order.user)

                elif gateway_status.is_failed:
                    tx.status = 'failed'
                else:
                    tx.status = 'pending'

                tx.save()
            except Exception as e:
                logger.error(f"Error checking HasadPay status on return for order #{order.id}: {str(e)}")

    if tx and tx.status == 'paid':
        is_success = True

    # Construct WhatsApp URL for customer convenience
    wa_url = None
    if supplier and supplier.phone:
        items_lines = [f"- {item.product.name} ({item.quantity})" for item in order.order_items.all()]
        items_list = "\n".join(items_lines)
        wa_message = f"مرحباً متجر {supplier.name}، لقد قمت بسداد طلبي رقم #{order.id} بنجاح عبر حصاد باي بقيمة {order.total_amount} {supplier.currency}.\n\nأصناف الطلب:\n{items_list}"
        wa_url = f"https://wa.me/{supplier.phone}?text={quote(wa_message)}"

    return render(request, 'hasadpay_return.html', {
        'order': order,
        'supplier': supplier,
        'tx': tx,
        'is_success': is_success,
        'status_display': status_display,
        'wa_url': wa_url,
    })


@csrf_exempt
@require_POST
def hasadpay_webhook_view(request, store_id=None):
    """Cryptographically verifies HMAC-SHA256 signature and processes HasadPay webhook events."""
    signature = request.headers.get("X-HasadPay-Signature") or request.META.get("HTTP_X_HASADPAY_SIGNATURE")
    payload_bytes = request.body

    try:
        raw_json = json.loads(payload_bytes.decode('utf-8'))
    except Exception:
        raw_json = {}

    # 1. Resolve Supplier
    supplier = None
    if store_id:
        supplier = Supplier.objects.filter(store_id=store_id).first() or Supplier.objects.filter(subdomain=store_id).first()

    merchant_ref = raw_json.get('merchant_reference') or raw_json.get('request_refrence') or raw_json.get('order_id')
    order = None

    if merchant_ref and str(merchant_ref).startswith('ORD-'):
        try:
            parsed_id = int(str(merchant_ref).replace('ORD-', ''))
            order = Order.objects.filter(id=parsed_id).first()
            if order and not supplier:
                supplier = order.get_supplier()
        except Exception:
            pass

    if not supplier and order:
        supplier = order.get_supplier()

    if not supplier:
        logger.warning(f"HasadPay Webhook received with unresolvable supplier: store_id={store_id}, ref={merchant_ref}")
        return HttpResponse("Supplier not found", status=404)

    config = getattr(supplier, 'hasadpay_config', None)
    if not config or not config.is_enabled:
        return HttpResponse("HasadPay is not active for this store", status=400)

    # 2. Cryptographic HMAC Signature Verification
    if config.webhook_secret:
        if not signature:
            logger.warning(f"HasadPay Webhook missing signature header for supplier {supplier.name}")
            return HttpResponse("Missing signature header", status=400)

        try:
            from hasadpay import HasadPayWebhook, HasadPaySignatureVerificationError

            event = HasadPayWebhook.construct_event(
                payload=payload_bytes,
                signature=signature,
                secret=config.webhook_secret,
            )
        except Exception as e:
            logger.warning(f"HasadPay Webhook signature verification failed for supplier {supplier.name}: {str(e)}")
            return HttpResponse("Invalid signature", status=400)
    else:
        # Fallback dummy event wrapper if merchant hasn't set webhook secret yet
        class MockEvent:
            def __init__(self, d):
                self.id = d.get('id') or d.get('transaction_id')
                self.event = d.get('event', 'payment.succeeded')
                self.merchant_reference = d.get('merchant_reference') or d.get('request_refrence')
                self.amount = d.get('amount')
                self.currency = d.get('currency', 'YER')
                self.payment_brand = d.get('payment_brand') or d.get('service_name') or 'HasadPay'
                self.is_payment_succeeded = d.get('status') in ['2', '000.000.000', 'paid', 'success'] or d.get('event') == 'payment.succeeded'

        event = MockEvent(raw_json)

    # 3. Process Event and Mark Order Paid
    if event.is_payment_succeeded:
        if not order and event.merchant_reference and str(event.merchant_reference).startswith('ORD-'):
            try:
                order_id = int(str(event.merchant_reference).replace('ORD-', ''))
                order = Order.objects.filter(id=order_id).first()
            except Exception:
                order = None

        if order:
            tx = getattr(order, 'hasadpay_transaction', None)
            if tx:
                tx.status = 'paid'
                tx.paid_at = timezone.now()
                tx.service_name = getattr(event, 'payment_brand', tx.service_name)
                tx.raw_webhook_payload = raw_json
                tx.save()

            # Record payment reference idempotently
            ref_num = f"HP-WH-{event.id or order.id}"
            if not OrderPaymentReference.objects.filter(order=order, reference_number=ref_num).exists():
                OrderPaymentReference.objects.create(
                    order=order,
                    amount=order.total_amount,
                    reference_number=ref_num,
                    recorded_by=order.user
                )

            # Auto-confirm order
            if config.auto_confirm_order:
                confirmed_status = OrderStatus.objects.filter(slug='confirmed').first()
                if confirmed_status and order.pipeline_status != confirmed_status:
                    order.update_status(confirmed_status, user=order.user)

            logger.info(f"HasadPay Webhook: Order #{order.id} marked as PAID successfully via {event.payment_brand}.")

    return JsonResponse({
        "status": "success",
        "order_id": order.id if order else None,
        "event_id": getattr(event, 'id', None),
    })
