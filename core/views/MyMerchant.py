from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required
from core.models import Supplier, Product, ProductOffer, Promotion, SuppierAds, Order, Category, PlatformOfferAd
from core.forms import SupplierSettingsForm, ProductForm
from django.db.models import Count, Sum, Avg
from django.utils import timezone





@login_required
def my_merchant(request):
    template_name = 'my_merchant.html'

    # Allow superuser to view other suppliers
    if request.user.is_superuser and request.GET.get('supplier_id'):
        supplier_id = request.GET.get('supplier_id')
        supplier = Supplier.objects.filter(id=supplier_id).first()
    else:
        supplier = Supplier.objects.filter(user=request.user).first()
    
    if not supplier:
        # If superuser tried to access invalid supplier, or normal user has no supplier
        if request.user.is_superuser and request.GET.get('supplier_id'):
             return redirect('suppliers_list') # Or show error message
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
    pending_orders = orders.filter(pipeline_status__slug='pending').count()
    confirmed_orders = orders.filter(pipeline_status__slug='confirmed').count()
    
    # Calculate total revenue
    total_revenue = orders.filter(pipeline_status__slug='confirmed').aggregate(
        total=Sum('total_amount')
    )['total'] or 0
    
    # Monthly sales for chart (simple last 6 months)
    # For now, let's just get the current month sales
    current_month_sales = supplier.get_total_sales_for_current_month()
    
    # Top selling products
    top_selling_products = Product.objects.filter(supplier=supplier).annotate(
        total_sold=Sum('orderitem__quantity')
    ).filter(total_sold__gt=0).order_by('-total_sold')[:5]
    
    # Category Performance
    category_performance = products.values('category__name').annotate(
        product_count=Count('id'),
        avg_price=Avg('price')
    ).order_by('-product_count')
    
    # Overall Feedback
    avg_rating = products.aggregate(avg=Avg('review__rating'))['avg'] or 0
    total_reviews = products.aggregate(total=Count('review'))['total'] or 0
    
    # Get recent orders (last 7 days)
    recent_orders = orders.filter(
        created_at__gte=timezone.now() - timezone.timedelta(days=7)
    ).count()
    
    # Get recent orders for display
    # Get promotions and ads
    ads = SuppierAds.objects.filter(supplier=supplier)
    platform_promotions = PlatformOfferAd.objects.filter(product__supplier=supplier).order_by('-id')
    
    ads_count = ads.count() # This was calculated before, moving it here after ads is defined.
    recent_orders_list = orders.order_by('-created_at')[:5]
    categories = Category.objects.all()
    
    context = {
        'supplier': supplier,
        'products': products,
        'active_offers': active_offers,
        'promotions': promotions,
        'ads': ads,
        'platform_promotions': platform_promotions,
        'total_products': total_products,
        'active_offers_count': active_offers_count,
        'promotions_count': promotions_count,
        'ads_count': ads_count,
        'total_orders': total_orders,
        'pending_orders': pending_orders,
        'confirmed_orders': confirmed_orders,
        'total_revenue': total_revenue,
        'current_month_sales': current_month_sales,
        'top_selling_products': top_selling_products,
        'category_performance': category_performance,
        'avg_rating': avg_rating,
        'total_reviews': total_reviews,
        'recent_orders': recent_orders,
        'recent_orders_list': recent_orders_list,
        'settings_form': SupplierSettingsForm(instance=supplier),
        'product_form': ProductForm(supplier=supplier),
        'categories': Category.objects.all(),
    }
    
    return render(request, template_name, context)


@login_required
def update_merchant_settings(request):
    supplier = None
    if request.user.is_superuser:
        if request.POST.get('supplier_id'):
           supplier = Supplier.objects.filter(id=request.POST.get('supplier_id')).first()
        elif request.GET.get('supplier_id'):
            supplier = Supplier.objects.filter(id=request.GET.get('supplier_id')).first()

    if not supplier:
        supplier = Supplier.objects.filter(user=request.user).first()
        
    if not supplier:
        return redirect('suppliers_list')
    
    if request.method == 'POST':
        form = SupplierSettingsForm(request.POST, request.FILES, instance=supplier)
        if form.is_valid():
            form.save()
            
            # If superuser is editing another merchant, redirect back to that merchant's dashboard
            if request.user.is_superuser and supplier.user != request.user:
                return redirect(f"/my-merchant/?supplier_id={supplier.id}")
                
            return redirect('my_merchant')
    
    # Also handle the final redirect similarly
    if request.user.is_superuser and supplier.user != request.user:
        return redirect(f"/my-merchant/?supplier_id={supplier.id}")
    return redirect('my_merchant')