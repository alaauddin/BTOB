


from django.shortcuts import render, redirect
from core.models import Cart, Supplier, SupplierCategory, PlatformOfferAd
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
    categories = SupplierCategory.objects.all().distinct()

    # Fetch active platform ads
    today = timezone.now().date()
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
        
        
    
    # Fetch producing family suppliers
    producing_family_suppliers = Supplier.objects.filter(category__producing_family=True, is_active=True).distinct().order_by('-priority')

    # Handle Business Request Form
    if request.method == 'POST':
        form = BusinessRequestForm(request.POST)
        if form.is_valid():
            form.save()
            messages.success(request, 'تم إرسال طلبك بنجاح! سنتواصل معك قريباً.')
            return redirect('suppliers_list')
    else:
        form = BusinessRequestForm()

    return render(
        request,
        'suppliers_list.html',
        {
            'suppliers': suppliers,
            'categories': categories,
            'pending_orders': pending_orders,
            'supplier': supplier,
            'q': q,
            'platform_ads': platform_ads,
            'producing_family_suppliers': producing_family_suppliers,
            'business_form': form,
        },
    )