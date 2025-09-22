from django.shortcuts import render, get_object_or_404, redirect
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.db.models import Q, Sum, Count
from django.utils import timezone
from core.models import Supplier, Order, OrderItem, ShippingAddress
from django.core.paginator import Paginator


@login_required
def merchant_orders(request):
    """Display all orders for the merchant's supplier"""
    template_name = 'merchant_orders.html'
    
    # Get the supplier for the current user
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
        orders = orders.filter(status=status_filter)
    
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
    pending_orders = orders.filter(status='Pending').count()
    confirmed_orders = orders.filter(status='Confirmed').count()
    
    # Calculate total revenue
    total_revenue = orders.filter(status='Confirmed').aggregate(
        total=Sum('total_amount')
    )['total'] or 0
    
    # Get recent orders (last 7 days)
    recent_orders = orders.filter(
        created_at__gte=timezone.now() - timezone.timedelta(days=7)
    ).count()
    print(orders)
    
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
    }
    
    return render(request, template_name, context)


@login_required
def merchant_order_detail(request, order_id):
    """Display detailed view of a specific order for the merchant"""
    template_name = 'merchant_order_detail.html'
    
    # Get the supplier for the current user
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
    
    # Calculate order statistics for this supplier
    supplier_order_total = order.total_amount
    
    context = {
        'supplier': supplier,
        'order': order,
        'order_items': order_items,
        'shipping_address': shipping_address,
        'supplier_order_total': supplier_order_total,
    }
    
    return render(request, template_name, context)


@login_required
def update_order_status(request, order_id):
    """Update the status of an order"""
    if request.method == 'POST':
        new_status = request.POST.get('status')
        
        # Get the supplier for the current user
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
        if new_status in ['Pending', 'Confirmed']:
            order.status = new_status
            order.save()
            messages.success(request, f'Order status updated to {new_status}')
        else:
            messages.error(request, 'Invalid status selected.')
    
    return redirect('merchant_order_detail', order_id=order_id)
