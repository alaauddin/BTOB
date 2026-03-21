"""Delivery driver management and dashboard views.

Provides views for managing delivery drivers (list, add, toggle status),
assigning drivers to orders, and a driver-facing dashboard for viewing
and managing assigned deliveries.
"""

import logging

from django.conf import settings
from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.contrib.auth.models import User
from django.http import JsonResponse
from django.shortcuts import get_object_or_404, redirect, render
import json

from core.decorators import merchant_required
from core.models import DeliveryDriver, Order, OrderStatus, Supplier
from core.utils.merchant_utils import get_active_supplier

logger = logging.getLogger(__name__)


@login_required
def driver_dashboard(request):
    """Dashboard for delivery drivers showing their assigned orders.

    Returns
    -------
    HttpResponse
        Rendered driver dashboard page, or redirect if user is not a driver.
    """
    driver = DeliveryDriver.objects.filter(user=request.user, is_active=True).select_related('supplier').first()
    if not driver:
        messages.error(request, 'هذا الحساب غير مسجل كسائق توصيل.')
        return redirect('merchant_login')

    supplier = driver.supplier
    status_filter = request.GET.get('status', 'active')

    # Get all orders assigned to this driver
    assigned_orders = Order.objects.filter(
        delivery_driver=driver
    ).select_related(
        'user', 'pipeline_status'
    ).order_by('-created_at')

    # Filter by status tab
    if status_filter == 'active':
        # Active = not delivered and not cancelled
        assigned_orders = assigned_orders.exclude(
            pipeline_status__slug__in=['delivered', 'cancelled']
        )
    elif status_filter == 'delivered':
        assigned_orders = assigned_orders.filter(pipeline_status__slug='delivered')

    # Get counts for tabs
    all_count = Order.objects.filter(delivery_driver=driver).count()
    active_count = Order.objects.filter(delivery_driver=driver).exclude(
        pipeline_status__slug__in=['delivered', 'cancelled']
    ).count()
    delivered_count = Order.objects.filter(
        delivery_driver=driver, pipeline_status__slug='delivered'
    ).count()

    # Get workflow steps for status updates
    workflow_steps = []
    if supplier.workflow:
        workflow_steps = supplier.workflow.steps.all().select_related('status').order_by('priority')

    context = {
        'driver': driver,
        'supplier': supplier,
        'orders': assigned_orders,
        'status_filter': status_filter,
        'all_count': all_count,
        'active_count': active_count,
        'delivered_count': delivered_count,
        'workflow_steps': workflow_steps,
    }
    return render(request, 'driver_dashboard.html', context)


@login_required
def driver_update_order_status(request, order_id):
    """Allow a driver to advance the assigned order to its next workflow step.

    Parameters
    ----------
    request : HttpRequest
        POST request.
    order_id : int
        Primary key of the order.

    Returns
    -------
    JsonResponse
        Success/failure response.
    """
    if request.method != 'POST':
        return JsonResponse({'success': False, 'message': 'طريقة غير صالحة'}, status=405)

    driver = DeliveryDriver.objects.filter(user=request.user, is_active=True).first()
    if not driver:
        return JsonResponse({'success': False, 'message': 'غير مصرح'}, status=403)

    order = get_object_or_404(Order, id=order_id, delivery_driver=driver)

    next_status = order.get_next_status()
    if not next_status:
        return JsonResponse({'success': False, 'message': 'الطلب في آخر مرحلة ولا يمكن تحديثه.'}, status=400)

    success, message = order.move_to_next_status()
    if not success:
        return JsonResponse({'success': False, 'message': message}, status=400)

    # Note: move_to_next_status updates pipeline_status
    order.refresh_from_db()

    return JsonResponse({
        'success': True,
        'message': f"تم انتقال الطلب إلى: {order.pipeline_status.name}",
        'new_status': order.pipeline_status.name,
        'new_slug': order.pipeline_status.slug,
    })


@login_required
def driver_order_map(request, order_id):
    """Display a map showing the route from the supplier to the customer.

    Parameters
    ----------
    request : HttpRequest
        GET request.
    order_id : int
        Primary key of the order.

    Returns
    -------
    HttpResponse
        Rendered map page.
    """
    driver = DeliveryDriver.objects.filter(user=request.user, is_active=True).first()
    if not driver:
        messages.error(request, 'غير مصرح')
        return redirect('merchant_login')

    order = get_object_or_404(Order, id=order_id, delivery_driver=driver)
    supplier = driver.supplier
    
    address = order.shippingaddress_set.first()
    if not address or not address.latitude or not address.longitude:
        messages.warning(request, 'عنوان العميل لا يحتوي على إحداثيات الخريطة.')
        return redirect('driver_dashboard')

    if not supplier.latitude or not supplier.longitude:
        messages.warning(request, 'لم يتم تعيين موقع المتجر على الخريطة.')
        return redirect('driver_dashboard')

    # Prepare coordinates for the template
    store_location = {
        'lat': float(supplier.latitude),
        'lng': float(supplier.longitude),
        'name': supplier.name,
    }
    
    customer_location = {
        'lat': float(address.latitude),
        'lng': float(address.longitude),
        'name': order.user.get_full_name() or order.user.username,
        'address': f"{address.address_line1}, {address.city}"
    }

    context = {
        'order': order,
        'supplier': supplier,
        'store_location': json.dumps(store_location),
        'customer_location': json.dumps(customer_location),
        # Using Google Maps standard API Key if available in settings, or empty string to be filled
        'google_maps_api_key': getattr(settings, 'GOOGLE_MAPS_API_KEY', ''), 
    }
    return render(request, 'driver_order_map.html', context)




@merchant_required
def manage_drivers(request):
    """List all delivery drivers for the current supplier.

    Parameters
    ----------
    request : HttpRequest
        The incoming HTTP request.

    Returns
    -------
    HttpResponse
        Rendered driver management page, or redirect if feature is disabled.
    """
    supplier = get_active_supplier(request)
    if not supplier:
        return redirect('suppliers_list')

    if not supplier.enable_delivery_drivers:
        messages.error(request, 'ميزة سائقي التوصيل غير مفعّلة لهذا المتجر.')
        return redirect('my_merchant')

    drivers = DeliveryDriver.objects.filter(supplier=supplier).select_related('user').order_by('-created_at')

    context = {
        'supplier': supplier,
        'drivers': drivers,
        'active_drivers_count': drivers.filter(is_active=True).count(),
        'total_drivers_count': drivers.count(),
    }

    return render(request, 'merchant_drivers.html', context)


@merchant_required
def add_driver(request):
    """Create a new driver account (User + DeliveryDriver) for the supplier.

    Parameters
    ----------
    request : HttpRequest
        POST request with driver details (name, phone, username, password).

    Returns
    -------
    HttpResponse
        Redirect to driver management page.
    """
    if request.method != 'POST':
        return redirect('manage_drivers')

    supplier = get_active_supplier(request)
    if not supplier or not supplier.enable_delivery_drivers:
        messages.error(request, 'ميزة سائقي التوصيل غير مفعّلة.')
        return redirect('my_merchant')

    first_name = request.POST.get('first_name', '').strip()
    last_name = request.POST.get('last_name', '').strip()
    phone = request.POST.get('phone', '').strip()
    username = request.POST.get('username', '').strip()
    password = request.POST.get('password', '').strip()

    if not all([first_name, phone, username, password]):
        messages.error(request, 'جميع الحقول مطلوبة.')
        return redirect('manage_drivers')

    # Check for duplicate username
    if User.objects.filter(username=username).exists():
        messages.error(request, f'اسم المستخدم "{username}" مستخدم بالفعل. اختر اسماً آخر.')
        return redirect('manage_drivers')

    # Check if this phone is already a driver for this supplier
    if DeliveryDriver.objects.filter(phone=phone, supplier=supplier).exists():
        messages.error(request, 'يوجد سائق بنفس رقم الهاتف مسجل لدى هذا المتجر.')
        return redirect('manage_drivers')

    try:
        user = User.objects.create_user(
            username=username,
            password=password,
            first_name=first_name,
            last_name=last_name,
        )
        DeliveryDriver.objects.create(
            user=user,
            supplier=supplier,
            phone=phone,
        )
        logger.info(f"Driver '{username}' created for supplier '{supplier.name}'")
        messages.success(request, f'تم إضافة السائق {first_name} {last_name} بنجاح.')
    except Exception as exc:
        logger.error(f"Error creating driver: {exc}")
        messages.error(request, 'حدث خطأ أثناء إنشاء حساب السائق.')

    return redirect('manage_drivers')


@merchant_required
def toggle_driver_status(request, driver_id):
    """Activate or deactivate a delivery driver.

    Parameters
    ----------
    request : HttpRequest
        The incoming HTTP POST request.
    driver_id : int
        Primary key of the DeliveryDriver to toggle.

    Returns
    -------
    HttpResponse
        Redirect to driver management page.
    """
    if request.method != 'POST':
        return redirect('manage_drivers')

    supplier = get_active_supplier(request)
    if not supplier or not supplier.enable_delivery_drivers:
        messages.error(request, 'ميزة سائقي التوصيل غير مفعّلة.')
        return redirect('my_merchant')

    driver = get_object_or_404(DeliveryDriver, id=driver_id, supplier=supplier)
    driver.is_active = not driver.is_active
    driver.save()

    status_label = 'تم تفعيل' if driver.is_active else 'تم تعطيل'
    messages.success(request, f'{status_label} السائق {driver.user.get_full_name() or driver.user.username}.')
    return redirect('manage_drivers')


@merchant_required
def assign_driver_to_order(request, order_id):
    """Assign or unassign a delivery driver to an order.

    Parameters
    ----------
    request : HttpRequest
        POST request with optional ``driver_id`` field.
        If ``driver_id`` is empty or missing, the driver is unassigned.
    order_id : int
        Primary key of the Order to assign/unassign a driver.

    Returns
    -------
    HttpResponse
        JSON response for AJAX, or redirect for regular requests.
    """
    is_ajax = request.headers.get('X-Requested-With') == 'XMLHttpRequest'

    if request.method != 'POST':
        if is_ajax:
            return JsonResponse({'success': False, 'message': 'طريقة غير صالحة'}, status=405)
        return redirect('merchant_order_detail', order_id=order_id)

    supplier = get_active_supplier(request)
    if not supplier or not supplier.enable_delivery_drivers:
        if is_ajax:
            return JsonResponse({'success': False, 'message': 'ميزة سائقي التوصيل غير مفعّلة.'}, status=403)
        messages.error(request, 'ميزة سائقي التوصيل غير مفعّلة.')
        return redirect('merchant_order_detail', order_id=order_id)

    order = get_object_or_404(Order, id=order_id)

    # Verify order belongs to this supplier
    if not order.order_items.filter(product__supplier=supplier).exists():
        if is_ajax:
            return JsonResponse({'success': False, 'message': 'هذا الطلب لا يخص متجرك.'}, status=403)
        messages.error(request, 'هذا الطلب لا يخص متجرك.')
        return redirect('merchant_orders')

    driver_id = request.POST.get('driver_id')

    if not driver_id:
        # Unassign driver
        order.delivery_driver = None
        order.save()
        if is_ajax:
            return JsonResponse({'success': True, 'message': 'تم إلغاء تعيين السائق من الطلب.'})
        messages.success(request, 'تم إلغاء تعيين السائق من الطلب.')
    else:
        driver = DeliveryDriver.objects.filter(
            id=driver_id, supplier=supplier, is_active=True
        ).first()
        if not driver:
            if is_ajax:
                return JsonResponse({'success': False, 'message': 'السائق غير موجود أو غير نشط.'}, status=400)
            messages.error(request, 'السائق غير موجود أو غير نشط.')
            return redirect('merchant_order_detail', order_id=order_id)

        order.delivery_driver = driver
        order.save()
        driver_name = driver.user.get_full_name() or driver.user.username
        if is_ajax:
            return JsonResponse({'success': True, 'message': f'تم تعيين السائق {driver_name} للطلب #{order.id}.'})
        messages.success(request, f'تم تعيين السائق {driver_name} للطلب #{order.id}.')

    return redirect('merchant_order_detail', order_id=order_id)
