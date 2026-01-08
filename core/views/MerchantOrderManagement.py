import math
from django.shortcuts import render, get_object_or_404, redirect
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.db.models import Q, Sum, Count
from django.utils import timezone
from core.models import Supplier, Order, OrderItem, ShippingAddress, OrderStatus, OrderNote, OrderPaymentReference
from django.core.paginator import Paginator


def calculate_distance(lat1, lon1, lat2, lon2):
    """Calculate the great circle distance between two points in km"""
    if not all([lat1, lon1, lat2, lon2]):
        return None
    
    R = 6371  # Earth radius in km
    
    phi1, phi2 = math.radians(float(lat1)), math.radians(float(lat2))
    dphi = math.radians(float(lat2) - float(lat1))
    dlambda = math.radians(float(lon2) - float(lon1))
    
    a = math.sin(dphi / 2)**2 + \
        math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2)**2
    
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


@login_required
def merchant_orders(request):
    """Display all orders for the merchant's supplier"""
    template_name = 'merchant_orders.html'
    
    # Get the supplier for the current user or via supplier_id for superuser
    if request.user.is_superuser and request.GET.get('supplier_id'):
        supplier_id = request.GET.get('supplier_id')
        supplier = get_object_or_404(Supplier, id=supplier_id)
    else:
        supplier = Supplier.objects.filter(user=request.user).first()
    
    if not supplier:
        messages.error(request, 'You are not registered as a supplier.')
        return redirect('suppliers_list')
    
    # Get all orders that contain products from this supplier
    orders = Order.objects.filter(
        order_items__product__supplier=supplier
    ).distinct().order_by('-created_at')
    
    # Get filter parameters
    status_filter = request.GET.get('status', '')
    search_query = request.GET.get('search', '')
    date_from = request.GET.get('date_from', '')
    date_to = request.GET.get('date_to', '')
    
    # Apply filters
    if status_filter:
        orders = orders.filter(pipeline_status__slug=status_filter)
    
    if search_query:
        orders = orders.filter(
            Q(id__icontains=search_query) |
            Q(user__username__icontains=search_query) |
            Q(user__first_name__icontains=search_query) |
            Q(user__last_name__icontains=search_query)
        )
    
    if date_from:
        orders = orders.filter(created_at__date__gte=date_from)
    
    if date_to:
        orders = orders.filter(created_at__date__lte=date_to)
    
    # Pagination
    paginator = Paginator(orders, 20)  # Show 20 orders per page
    page_number = request.GET.get('page')
    page_obj = paginator.get_page(page_number)
    
    # Calculate statistics
    total_orders = orders.count()
    pending_orders = orders.filter(pipeline_status__slug='pending').count()
    confirmed_orders = orders.filter(pipeline_status__slug='confirmed').count()
    
    # Calculate total revenue
    total_revenue = orders.filter(pipeline_status__slug='confirmed').aggregate(
        total=Sum('total_amount')
    )['total'] or 0
    
    # Get recent orders (last 7 days)
    recent_orders = orders.filter(
        created_at__gte=timezone.now() - timezone.timedelta(days=7)
    ).count()
    print(orders)
    
    # Workflow steps for filter
    workflow_steps = []
    if supplier.workflow:
        workflow_steps = supplier.workflow.steps.all().select_related('status')

    context = {
        'supplier': supplier,
        'page_obj': page_obj,
        'total_orders': total_orders,
        'pending_orders': pending_orders,
        'confirmed_orders': confirmed_orders,
        'total_revenue': total_revenue,
        'recent_orders': recent_orders,
        'status_filter': status_filter,
        'search_query': search_query,
        'date_from': date_from,
        'date_to': date_to,
        'workflow_steps': workflow_steps,
    }
    
    return render(request, template_name, context)


@login_required
def merchant_order_detail(request, order_id):
    """Display detailed view of a specific order for the merchant with premium insights"""
    template_name = 'merchant_order_detail.html'
    
    # Get the supplier for the current user or via supplier_id for superuser
    if request.user.is_superuser and request.GET.get('supplier_id'):
        supplier_id = request.GET.get('supplier_id')
        supplier = get_object_or_404(Supplier, id=supplier_id)
    else:
        supplier = Supplier.objects.filter(user=request.user).first()
    
    if not supplier:
        messages.error(request, 'You are not registered as a supplier.')
        return redirect('suppliers_list')
    
    # Get the order and verify it belongs to this supplier
    order = get_object_or_404(Order, id=order_id)
    
    # Check if this order contains products from the supplier
    order_items = order.order_items.filter(product__supplier=supplier)
    if not order_items.exists():
        messages.error(request, 'This order does not contain any of your products.')
        return redirect('merchant_orders')
    
    # Get shipping address
    try:
        shipping_address = ShippingAddress.objects.get(order=order)
    except ShippingAddress.DoesNotExist:
        shipping_address = None
    
    # Customer Insights
    customer = order.user
    customer_orders = Order.objects.filter(
        user=customer,
        order_items__product__supplier=supplier
    ).distinct().order_by('-created_at')
    
    customer_stats = {
        'total_spent': sum(o.total_amount for o in customer_orders),
        'order_count': customer_orders.count(),
        'recent_history': customer_orders.exclude(id=order.id)[:5]
    }
    
    # Workflow steps for visualization
    workflow_steps = []
    if supplier.workflow:
        workflow_steps = supplier.workflow.steps.all().select_related('status')
    
    # Calculate Distance and Delivery Fee
    distance_km = None
    expected_delivery_fee = 0
    
    if supplier.enable_delivery_fees and supplier.latitude and supplier.longitude and shipping_address and shipping_address.latitude and shipping_address.longitude:
        distance_km = order.calculate_distance(
            supplier.latitude, supplier.longitude,
            shipping_address.latitude, shipping_address.longitude
        )
        if distance_km:
            expected_delivery_fee = order.get_expected_delivery_fee()

    # Internal Notes
    order_notes = order.notes.all().select_related('user').order_by('-created_at')
    
    # Payment References
    payment_references = order.payment_references.all().select_related('recorded_by').order_by('-created_at')
    
    # Pending Orders for FAB Quick View
    pending_orders = Order.objects.filter(
        order_items__product__supplier=supplier,
        pipeline_status__slug='pending'
    ).distinct().order_by('-created_at')
    
    # Calculate order statistics for this supplier
    supplier_order_total = order.total_amount
    items_total = sum(item.get_subtotal_with_discount() for item in order_items)
    
    context = {
        'supplier': supplier,
        'order': order,
        'order_items': order_items,
        'shipping_address': shipping_address,
        'supplier_order_total': supplier_order_total,
        'items_total': items_total,
        'customer_stats': customer_stats,
        'workflow_steps': workflow_steps,
        'order_notes': order_notes,
        'payment_references': payment_references,
        'pending_orders': pending_orders,
        'pending_count': pending_orders.count(),
        'distance_km': distance_km,
        'expected_delivery_fee': expected_delivery_fee,
    }
    
    return render(request, template_name, context)


@login_required
def add_payment_reference(request, order_id):
    """Handle adding a payment reference to an order"""
    if request.method == 'POST':
        order = get_object_or_404(Order, id=order_id)
        amount = request.POST.get('amount')
        reference_number = request.POST.get('reference_number')
        
        if amount and reference_number:
            OrderPaymentReference.objects.create(
                order=order,
                amount=amount,
                reference_number=reference_number,
                recorded_by=request.user
            )
            messages.success(request, 'Payment reference recorded successfully.')
        else:
            messages.error(request, 'Please provide both amount and reference number.')
            
    return redirect('merchant_order_detail', order_id=order_id)


@login_required
def add_order_note(request, order_id):
    """Handle adding internal notes to an order"""
    if request.method == 'POST':
        order = get_object_or_404(Order, id=order_id)
        note_text = request.POST.get('note')
        
        if note_text:
            OrderNote.objects.create(
                order=order,
                user=request.user,
                note=note_text
            )
            messages.success(request, 'Internal note added successfully.')
        else:
            messages.error(request, 'Note content cannot be empty.')
            
    return redirect('merchant_order_detail', order_id=order_id)


@login_required
def update_order_status(request, order_id):
    """Update the status of an order"""
    if request.method == 'POST':
        new_status = request.POST.get('status')
        
        # Get the supplier for the current user or via supplier_id for superuser
        if request.user.is_superuser and request.POST.get('supplier_id'):
            supplier_id = request.POST.get('supplier_id')
            supplier = get_object_or_404(Supplier, id=supplier_id)
        else:
            supplier = Supplier.objects.filter(user=request.user).first()
        
        if not supplier:
            messages.error(request, 'You are not registered as a supplier.')
            return redirect('suppliers_list')
        
        # Get the order and verify it belongs to this supplier
        order = get_object_or_404(Order, id=order_id)
        print(order)
        # Check if this order contains products from the supplier
        order_items = order.order_items.filter(product__supplier=supplier)
        if not order_items.exists():
            messages.error(request, 'This order does not contain any of your products.')
            return redirect('merchant_orders')
        
        # Update the order status
        if new_status == 'next':
            success, message = order.move_to_next_status()
            if success:
                messages.success(request, message)
            else:
                messages.error(request, message)
        else:
            status_obj = OrderStatus.objects.filter(slug=new_status).first()
            if status_obj:
                order.pipeline_status = status_obj
                order.save()
                messages.success(request, f'تم تحديث حالة الطلب إلى {status_obj.name}')
            else:
                messages.error(request, 'الحالة المختارة غير صالحة.')
    
    return redirect('merchant_order_detail', order_id=order_id)
