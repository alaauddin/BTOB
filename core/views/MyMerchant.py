from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required
from core.models import Supplier, Product, ProductOffer, Promotion, SuppierAds, Order
from django.db.models import Count, Sum
from django.utils import timezone





@login_required
def my_merchant(request):
    template_name = 'my_merchant.html'
    supplier = Supplier.objects.filter(user=request.user).first()
    
    if not supplier:
        return redirect('suppliers_list')
    
    # Get all related data
    products = Product.objects.filter(supplier=supplier)
    active_offers = ProductOffer.objects.filter(
        product__supplier=supplier, 
        is_active=True
    )
    promotions = Promotion.objects.filter(supplier=supplier)
    ads = SuppierAds.objects.filter(supplier=supplier)
    
    # Calculate statistics
    total_products = products.count()
    active_offers_count = active_offers.count()
    promotions_count = promotions.count()
    ads_count = ads.count()
    
    # Order statistics
    orders = Order.objects.filter(order_items__product__supplier=supplier).distinct()
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
    
    # Get recent orders for display
    recent_orders_list = orders.order_by('-created_at')[:5]
    
    context = {
        'supplier': supplier,
        'products': products,
        'active_offers': active_offers,
        'promotions': promotions,
        'ads': ads,
        'total_products': total_products,
        'active_offers_count': active_offers_count,
        'promotions_count': promotions_count,
        'ads_count': ads_count,
        'total_orders': total_orders,
        'pending_orders': pending_orders,
        'confirmed_orders': confirmed_orders,
        'total_revenue': total_revenue,
        'recent_orders': recent_orders,
        'recent_orders_list': recent_orders_list,
    }
    
    return render(request, template_name, context)