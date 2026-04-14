from django.shortcuts import render, redirect, get_object_or_404
from django.http import JsonResponse
from django.contrib.auth.decorators import login_required
from core.decorators import merchant_required
from django.db.models.functions import TruncDate
from datetime import timedelta
import json
import logging
from decimal import Decimal
from django.core.files.base import ContentFile
from core.models import WebsiteStatistic, Supplier, Product, ProductOffer, Promotion, SupplierAds, Order, Category, PlatformOfferAd, WholesaleProduct
from core.forms import ProductForm, SupplierSettingsForm, DomainOnlyForm, BrandingOnlyForm, LocationOnlyForm, CurrencyOnlyForm
from django.db.models import Count, Sum, Avg
from django.utils import timezone
from core.models import SupplierAdPlatfrom
from core.utils.merchant_utils import get_active_supplier
logger = logging.getLogger("core.views.MyMerchant")






@merchant_required
def my_merchant(request):
    template_name = 'my_merchant.html'

    # Allow superuser to view other suppliers
    supplier = get_active_supplier(request)
    
    if not supplier:
        logger.warning(f"No active supplier found for user {request.user} in my_merchant")
        if request.user.is_superuser:
             return redirect('suppliers_list')
        # Should be caught by decorator, but as fallback
        return redirect('join_business')
    
    # Simple Router Stats
    orders = Order.objects.filter(order_items__product__supplier=supplier).distinct()
    import logging
    logger = logging.getLogger('core')
    logger.info(f"Accessing merchant dashboard for supplier: {supplier} (ID: {supplier.id})")
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
        'domain_form': DomainOnlyForm(instance=supplier),
        'branding_form': BrandingOnlyForm(instance=supplier),
        'location_form': LocationOnlyForm(instance=supplier, prefix='loc'),
        'currency_form': CurrencyOnlyForm(instance=supplier),
    }
    
    # --- Statistics & Analytics ---
    today = timezone.now().date()
    thirty_days_ago = today - timedelta(days=29)
    
    # 1. Visitor stats (Last 30 days)
    visitor_stats_qs = WebsiteStatistic.objects.filter(
        supplier=supplier,
        visited_at__date__gte=thirty_days_ago
    ).annotate(
        date=TruncDate('visited_at')
    ).values('date').annotate(
        count=Count('id')
    ).order_by('date')
    
    # Fill missing dates with 0
    stats_dict = {stat['date'].strftime('%Y-%m-%d'): stat['count'] for stat in visitor_stats_qs}
    visitor_labels = []
    visitor_data = []
    
    for i in range(30):
        d = thirty_days_ago + timedelta(days=i)
        ds = d.strftime('%Y-%m-%d')
        visitor_labels.append(ds)
        visitor_data.append(stats_dict.get(ds, 0))
    
    # 2. Product Views (Top 10)
    top_viewed_products = Product.objects.filter(supplier=supplier).order_by('-views_count')[:10]
    product_labels = [p.name for p in top_viewed_products]
    product_views = [p.views_count for p in top_viewed_products]
    
    # 3. Wholesale Suggestions (Sourcing Hub)
    from core.db.wholesale import WholesaleProduct
    wholesale_suggestions = WholesaleProduct.objects.filter(is_active=True).order_by('-created_at')[:5]

    # Add to context after JSON serialization
    context.update({
        'visitor_labels_json': json.dumps(visitor_labels),
        'visitor_data_json': json.dumps(visitor_data),
        'product_labels_json': json.dumps(product_labels),
        'product_views_json': json.dumps(product_views),
        'wholesale_suggestions': wholesale_suggestions,
    })
    
    return render(request, template_name, context)


@merchant_required
def merchant_products(request):
    template_name = 'merchant_products.html'

    supplier = get_active_supplier(request)
    
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
        'has_seen_products_tour': supplier.has_seen_products_tour,
    }
    
    return render(request, template_name, context)


@merchant_required
def update_merchant_settings(request):
    supplier = None
    supplier = get_active_supplier(request)
        
    if not supplier:
        return redirect('suppliers_list')
    
    if request.method == 'POST':
        form_type = request.POST.get('form_type', 'all')
        
        if form_type == 'domain':
            form = DomainOnlyForm(request.POST, instance=supplier)
        elif form_type == 'branding':
            form = BrandingOnlyForm(request.POST, request.FILES, instance=supplier)
        elif form_type == 'location':
            form = LocationOnlyForm(request.POST, instance=supplier, prefix='loc')
        elif form_type == 'currency':
            form = CurrencyOnlyForm(request.POST, instance=supplier)
        else:
            form = SupplierSettingsForm(request.POST, request.FILES, instance=supplier)
            
        if form.is_valid():
            form.save()
            logger.info(f"User {request.user} updated {form_type} settings for supplier {supplier.name}")
            
            if request.headers.get('x-requested-with') == 'XMLHttpRequest':
                return JsonResponse({'success': True})

            if request.user.is_superuser and supplier.user != request.user:
                return redirect(f"/my-merchant/?supplier_id={supplier.id}")
                
            return redirect('my_merchant')
        else:
            if request.headers.get('x-requested-with') == 'XMLHttpRequest':
                return JsonResponse({'success': False, 'errors': form.errors}, status=400)
    
    context = {
        'settings_form': SupplierSettingsForm(instance=supplier),
        'domain_form': DomainOnlyForm(instance=supplier),
        'branding_form': BrandingOnlyForm(instance=supplier),
        'location_form': LocationOnlyForm(instance=supplier, prefix='loc'),
        'currency_form': CurrencyOnlyForm(instance=supplier),
        'supplier': supplier
    }
    return render(request, 'my_merchant.html', context)


@merchant_required
def merchant_marketing(request):
    template_name = 'merchant_marketing.html'

    supplier = get_active_supplier(request)
    
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

    supplier = get_active_supplier(request)
    
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
        supplier = get_active_supplier(request)
    
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
        supplier = get_active_supplier(request)
            
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


@merchant_required
def wholesale_market(request):
    template_name = 'wholesale_market.html'
    supplier = get_active_supplier(request)
    
    if not supplier:
        return redirect('suppliers_list')
        
    if not supplier.can_buy_wholesale:
        return redirect('dashboard_overview')
    
    from core.db.wholesale import WholesaleProduct, WholesaleSupplier
    from django.db.models import Q
    
    wholesale_products = WholesaleProduct.objects.filter(is_active=True)
    wholesalers = WholesaleSupplier.objects.filter(is_active=True)
    
    # Filtering Logic
    query = request.GET.get('q', '')
    wholesaler_id = request.GET.get('wholesaler_id', '')
    
    if query:
        wholesale_products = wholesale_products.filter(
            Q(name__icontains=query) | Q(description__icontains=query)
        )
        
    if wholesaler_id and wholesaler_id != 'all':
        wholesale_products = wholesale_products.filter(wholesaler_id=wholesaler_id)
        
    wholesale_products = wholesale_products.order_by('-created_at')
    
    # Identify products already inherited by this merchant
    inherited_product_ids = Product.objects.filter(
        supplier=supplier, 
        wholesale_origin__isnull=False
    ).values_list('wholesale_origin_id', flat=True)
    
    context = {
        'supplier': supplier,
        'wholesale_products': wholesale_products,
        'wholesalers': wholesalers,
        'inherited_product_ids': list(inherited_product_ids),
        'query': query,
        'wholesaler_id': wholesaler_id,
    }
    return render(request, template_name, context)


@merchant_required
def get_wholesale_product_details_ajax(request, product_id):
    supplier = get_active_supplier(request)
    if not supplier or not supplier.can_buy_wholesale:
        return JsonResponse({'success': False, 'message': 'Permission denied'}, status=403)
        
    from core.db.wholesale import WholesaleProduct
    wp = get_object_or_404(WholesaleProduct, id=product_id, is_active=True)
    
    images = [wp.image.url]
    for ai in wp.additional_images.all():
        images.append(ai.image.url)
        
    return JsonResponse({
        'success': True,
        'product': {
            'id': wp.id,
            'name': wp.name,
            'description': wp.description,
            'purchase_price': float(wp.purchase_price),
            'sale_price': float(wp.sale_price),
            'potential_profit': float(wp.potential_profit),
            'images': images,
            'wholesaler': wp.wholesaler.name,
            'category': wp.category.name,
            'stock': wp.stock,
        }
    })


@merchant_required
def inherit_wholesale_product_ajax(request, wholesale_product_id):
    if request.method != 'POST':
        return JsonResponse({'success': False, 'message': 'Invalid method'}, status=405)
    
    supplier = get_active_supplier(request)
    if not supplier or not supplier.can_buy_wholesale:
        return JsonResponse({'success': False, 'message': 'Permission denied'}, status=403)
    
    from core.db.wholesale import WholesaleProduct
    from core.db.product import Product, ProductImage
    from django.core.files.base import ContentFile
    
    wp = get_object_or_404(WholesaleProduct, id=wholesale_product_id, is_active=True)
    
    # Get custom price if provided (from POST JSON body)
    try:
        data = json.loads(request.body)
        custom_price = data.get('custom_price')
        if custom_price:
            final_price = Decimal(str(custom_price))
        else:
            final_price = wp.sale_price
    except (json.JSONDecodeError, ValueError):
        final_price = wp.sale_price

    try:
        # Create the new product
        new_product = Product.objects.create(
            supplier=supplier,
            category=wp.category,
            name=wp.name,
            description=wp.description,
            price=final_price,
            purchase_cost=wp.purchase_price,
            wholesale_origin=wp,
            stock=10,
            is_active=True,
            is_new=True
        )
        
        # Copy main image
        if wp.image:
            new_product.image.save(wp.image.name, ContentFile(wp.image.read()), save=True)
        
        # Copy video if exists
        if wp.video:
            new_product.video.save(wp.video.name, ContentFile(wp.video.read()), save=True)

        # Copy additional images
        for ai in wp.additional_images.all():
            new_img = ProductImage(product=new_product)
            new_img.image.save(ai.image.name, ContentFile(ai.image.read()), save=True)
            
        return JsonResponse({
            'success': True, 
            'message': f'تم استيراد المنتج "{wp.name}" بنجاح إلى متجرك!',
            'product_id': new_product.id
        })
        
    except Exception as e:
        logger.error(f"Error inheriting product {wholesale_product_id}: {str(e)}")
        return JsonResponse({'success': False, 'message': f'حدث خطأ: {str(e)}'}, status=500)