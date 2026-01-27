


from django.shortcuts import render, redirect
from core.models import Cart, Supplier, SupplierCategory, PlatformOfferAd, SupplierAdPlatfrom
from core.models import Order
from django.utils import timezone
from datetime import timedelta
from django.db.models import Q, Max, Count
from core.forms import BusinessRequestForm
from django.contrib import messages



def SuppliersListView(request):
    today = timezone.now().date()
    
    # Annotate suppliers with max discount and offers count to sort by "strongest offers"
    suppliers = Supplier.objects.filter(is_active=True).annotate(
        max_offer_discount=Max(
            'products__products_offer__discount_precentage',
            filter=Q(
                products__products_offer__is_active=True,
                products__products_offer__from_date__lte=today,
                products__products_offer__to_date__gte=today
            )
        ),
        offers_count=Count(
            'products__products_offer',
            filter=Q(
                products__products_offer__is_active=True,
                products__products_offer__from_date__lte=today,
                products__products_offer__to_date__gte=today
            ),
            distinct=True
        )
    ).order_by('-max_offer_discount', '-offers_count', '-priority')
    
    # Check if there is only one supplier
    if suppliers.count() == 1:
        supplier = suppliers.first()
        return redirect('product-list', store_id=supplier.store_id)
    
    # Get search query for display purposes only (client-side filtering)
    q = request.GET.get('q', '').strip()
    
    # Get all categories for the filter buttons
    categories = SupplierCategory.objects.filter(supplier__is_active=True).distinct()

    # Fetch active platform ads
    today = timezone.now().date()
    
    # Supplier Ads (Full Width Top)
    supplier_ads = SupplierAdPlatfrom.objects.filter(
        is_active=True,
        approved=True,
        start_datetime__lte=timezone.now(),
        end_datetime__gte=timezone.now()
    ).select_related('supplier')
    

    # Platform Offer Ads (Horizontal Scroll)
    platform_ads = PlatformOfferAd.objects.filter(
        start_date__lte=today,
        end_date__gte=today,
        is_approved=True,
        product__supplier__is_active=True
    ).order_by('order').select_related('product', 'product__supplier')

    
    if request.user.is_authenticated:
        # user_cart, created = Cart.objects.get_or_create(user=request.user)
        ten_days_ago = timezone.now() - timedelta(days=1)
        pending_orders = Order.objects.filter(
            user=request.user, created_at__gte=ten_days_ago, pipeline_status__slug='pending'
        )
        # cart = user_cart
        supplier = None
        
    else:
        # cart = None
        supplier = None
      
        pending_orders = None
        
        
    
    # Fetch producing family suppliers with max discount annotation
    producing_family_suppliers = Supplier.objects.filter(category__producing_family=True, is_active=True).annotate(
        max_offer_discount=Max(
            'products__products_offer__discount_precentage',
            filter=Q(
                products__products_offer__is_active=True,
                products__products_offer__from_date__lte=today,
                products__products_offer__to_date__gte=today
            )
        )
    ).distinct().order_by('-max_offer_discount', '-priority')

    # Handle Business Request Form - Moved to separate view (join_business)
    # Form logic removed from here

    return render(
        request,
        'suppliers_list.html',
        {
            'suppliers': suppliers,
            'categories': categories,
            'pending_orders': pending_orders,
            'supplier': supplier,
            'q': q,
            'supplier_ads': supplier_ads,
            'platform_ads': platform_ads,
            'producing_family_suppliers': producing_family_suppliers,
            # 'business_form': form, # Removed
        },
    )