from django.shortcuts import render, redirect, get_object_or_404
from django.http import JsonResponse
from django.contrib.auth.decorators import login_required
from core.decorators import merchant_required
from core.models import Supplier, Product, ProductOffer, Promotion, SupplierAds, Order, Category, PlatformOfferAd
from core.forms import SupplierSettingsForm, ProductForm
from django.db.models import Count, Sum, Avg
from django.utils import timezone
from core.models import SupplierAdPlatfrom





@merchant_required
def my_merchant(request):
    template_name = 'my_merchant.html'

    # Allow superuser to view other suppliers
    if request.user.is_superuser and request.GET.get('supplier_id'):
        supplier_id = request.GET.get('supplier_id')
        supplier = Supplier.objects.filter(id=supplier_id).first()
    else:
        # accessing related object safely
        supplier = getattr(request.user, 'supplier', None)
    
    if not supplier:
        if request.user.is_superuser:
             return redirect('suppliers_list')
        # Should be caught by decorator, but as fallback
        return redirect('join_business')
    
    # Simple Router Stats
    orders = Order.objects.filter(order_items__product__supplier=supplier).distinct()
    pending_orders = orders.filter(pipeline_status__slug='pending').count()
    total_products = Product.objects.filter(supplier=supplier).count()
    
    # Revenue (Confirmed orders)
    total_revenue = orders.filter(pipeline_status__slug='confirmed').aggregate(
        total=Sum('total_amount')
    )['total'] or 0
    
    # Recent items for widgets
    recent_orders_list = orders.order_by('-created_at')[:5]
    top_selling_products = Product.objects.filter(supplier=supplier).annotate(
        total_sold=Sum('orderitem__quantity')
    ).filter(total_sold__gt=0).order_by('-total_sold')[:5]
    
    avg_rating = Product.objects.filter(supplier=supplier).aggregate(avg=Avg('review__rating'))['avg'] or 0

    context = {
        'supplier': supplier,
        'pending_orders': pending_orders,
        'total_orders': orders.count(),
        'total_products': total_products,
        'total_revenue': total_revenue,
        'recent_orders_list': recent_orders_list,
        'top_selling_products': top_selling_products,
        'avg_rating': avg_rating,
        'settings_form': SupplierSettingsForm(instance=supplier),
    }
    
    return render(request, template_name, context)


@merchant_required
def merchant_products(request):
    template_name = 'merchant_products.html'

    if request.user.is_superuser and request.GET.get('supplier_id'):
        supplier_id = request.GET.get('supplier_id')
        supplier = Supplier.objects.filter(id=supplier_id).first()
    else:
        supplier = getattr(request.user, 'supplier', None)
    
    if not supplier:
        return redirect('suppliers_list')
    
    products = Product.objects.filter(supplier=supplier)
    active_offers = ProductOffer.objects.filter(product__supplier=supplier, is_active=True)
    platform_promotions = PlatformOfferAd.objects.filter(product__supplier=supplier).order_by('-id')
    categories = Category.objects.all()
    
    context = {
        'supplier': supplier,
        'products': products,
        'active_products_count': products.filter(is_active=True).count(),
        'inactive_products_count': products.filter(is_active=False).count(),
        'active_offers': active_offers,
        'active_offers_count': active_offers.count(),
        'platform_promotions': platform_promotions,
        'categories': categories,
        'product_form': ProductForm(supplier=supplier),
    }
    
    return render(request, template_name, context)


@merchant_required
def update_merchant_settings(request):
    supplier = None
    if request.user.is_superuser:
        if request.POST.get('supplier_id'):
           supplier = Supplier.objects.filter(id=request.POST.get('supplier_id')).first()
        elif request.GET.get('supplier_id'):
            supplier = Supplier.objects.filter(id=request.GET.get('supplier_id')).first()

    if not supplier:
        supplier = getattr(request.user, 'supplier', None)
        
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
    
    return render(request, 'my_merchant.html', {'settings_form': SupplierSettingsForm(instance=supplier), 'supplier': supplier})


@merchant_required
def merchant_marketing(request):
    template_name = 'merchant_marketing.html'

    if request.user.is_superuser and request.GET.get('supplier_id'):
        supplier_id = request.GET.get('supplier_id')
        supplier = Supplier.objects.filter(id=supplier_id).first()
    else:
        supplier = getattr(request.user, 'supplier', None)
    
    if not supplier:
        return redirect('suppliers_list')
    
    ads = SupplierAds.objects.filter(supplier=supplier)
    products = Product.objects.filter(supplier=supplier)
    
    # Platform Ads (SupplierAdPlatfrom)
    platform_ads = SupplierAdPlatfrom.objects.filter(supplier=supplier)
    
    context = {
        'supplier': supplier,
        'ads': ads,
        'platform_ads': platform_ads,
        'products': products,
        'total_ads_count': ads.count() + platform_ads.count(),
        'active_ads_count': ads.filter(is_active=True).count() + platform_ads.filter(is_active=True).count(),
        'inactive_ads_count': ads.filter(is_active=False).count() + platform_ads.filter(is_active=False).count(),
    }
    
    return render(request, template_name, context)


@merchant_required
def merchant_analytics(request):
    template_name = 'merchant_analytics.html'

    if request.user.is_superuser and request.GET.get('supplier_id'):
        supplier_id = request.GET.get('supplier_id')
        supplier = Supplier.objects.filter(id=supplier_id).first()
    else:
        supplier = getattr(request.user, 'supplier', None)
    
    if not supplier:
        return redirect('suppliers_list')
    
    products = Product.objects.filter(supplier=supplier)
    category_performance = products.values('category__name').annotate(
        product_count=Count('id'),
        avg_price=Avg('price')
    ).order_by('-product_count')
    
    avg_rating = products.aggregate(avg=Avg('review__rating'))['avg'] or 0
    total_reviews = products.aggregate(total=Count('review'))['total'] or 0
    
    context = {
        'supplier': supplier,
        'category_performance': category_performance,
        'avg_rating': avg_rating,
        'total_reviews': total_reviews,
        'total_products': products.count(),
    }
    
    return render(request, template_name, context)


@merchant_required
def merchant_tutorial(request):
    template_name = 'merchant_tutorial.html'

    if request.user.is_superuser and request.GET.get('supplier_id'):
        supplier_id = request.GET.get('supplier_id')
        supplier = Supplier.objects.filter(id=supplier_id).first()
    else:
        supplier = Supplier.objects.filter(user=request.user).first()
    
    if not supplier:
        return redirect('suppliers_list')
    
    context = {
        'supplier': supplier,
    }
    
    return render(request, template_name, context)


@merchant_required
def quick_update_stock(request, product_id):
    if request.method == 'POST':
        # Get the supplier
        if request.user.is_superuser and (request.POST.get('supplier_id') or request.GET.get('supplier_id')):
            supplier_id = request.POST.get('supplier_id') or request.GET.get('supplier_id')
            supplier = get_object_or_404(Supplier, id=supplier_id)
        else:
            supplier = getattr(request.user, 'supplier', None)
            
        if not supplier:
            return JsonResponse({'success': False, 'message': 'You are not registered as a supplier.'}, status=403)
            
        product = get_object_or_404(Product, id=product_id, supplier=supplier)
        new_stock = request.POST.get('stock')
        
        if new_stock is not None:
            try:
                product.stock = int(new_stock)
                product.save()
                return JsonResponse({
                    'success': True, 
                    'message': 'تم تحديث المخزون بنجاح',
                    'new_stock': product.stock
                })
            except ValueError:
                return JsonResponse({'success': False, 'message': 'قيمة المخزون غير صالحة'}, status=400)
    
    return JsonResponse({'success': False, 'message': 'Invalid request'}, status=400)