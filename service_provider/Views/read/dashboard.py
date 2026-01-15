from django.shortcuts import render, redirect, get_object_or_404
import logging
from core.models import Supplier, Product, Order, Review, Promotion, Discount
from django.contrib.auth.decorators import login_required
from django.utils import timezone

logger = logging.getLogger(__name__)



@login_required
def supplier_dashboard(request):
    # Get the supplier associated with the current logged-in user
    supplier = get_object_or_404(Supplier, user=request.user)
    this_monthe_name = timezone.now().strftime('%B')
    logger.info(this_monthe_name)
    # Get related products, orders, reviews, promotions, and discounts
    products = Product.objects.filter(supplier=supplier)
    orders = Order.objects.filter(order_items__product__supplier=supplier, created_at__month=timezone.now().month).distinct()
    orders_pending = Order.objects.filter(order_items__product__supplier=supplier, created_at__month=timezone.now().month,status='Pending').distinct()
    orders_confiremt = Order.objects.filter(order_items__product__supplier=supplier, created_at__month=timezone.now().month,status='Confirmed').distinct()
    
    reviews = Review.objects.filter(product__supplier=supplier)
    promotions = Promotion.objects.filter(supplier=supplier)
    discounts = Discount.objects.filter(promotion__in=promotions)

    # Initialize sales chart data
    sales_chart = []
    for order in orders:
        if order.created_at and order.total_amount:  # Ensure these fields are not None
            sales_chart.append({
                'date': order.created_at.strftime('%Y-%m-%d'),  # Format the date
                'total_amount': order.total_amount,
            })
    
    # Prepare context for the template
    context = {
        'supplier': supplier,
        'products': products,
        'orders': orders,
        'reviews': reviews,
        'promotions': promotions,
        'discounts': discounts,
        'sales_chart': sales_chart,
        'this_monthe': this_monthe_name,
        'orders_pending': orders_pending,
        'orders_confiremt': orders_confiremt,
    }
    
    return render(request, 'read/supplier_dashboard.html', context)


@login_required
def update_supplier_profile(request):
    supplier = get_object_or_404(Supplier, user=request.user)

    if request.method == 'POST':
        supplier.name = request.POST['name']
        supplier.phone = request.POST['phone']
        supplier.address = request.POST['address']
        supplier.city = request.POST['city']
        supplier.country = request.POST['country']
        supplier.save()
        return redirect('supplier_dashboard')

    context = {'supplier': supplier}
    return render(request, 'read/update_profile.html', context)
