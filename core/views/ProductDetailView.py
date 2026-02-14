from django.shortcuts import render, get_object_or_404
from core.models import Product, Cart, Supplier
from django.contrib.auth.decorators import login_required

# @login_required
def product_detail(request, pk, store_id=None, store_slug=None):
    """Function-based view for product detail.

    Provides context similar to the previous DetailView:
    - product: Product instance (pk)
    - supplier: Supplier related to the product (if any)
    - cart: user's Cart for that supplier (or None)
    """
    product = get_object_or_404(Product.objects.prefetch_related('additional_images'), pk=pk)
    
    # Resolve Supplier
    target_slug = store_slug or store_id
    if not target_slug:
         raise Http404("Store identifier missing")
         
    if hasattr(request, 'current_store') and request.current_store.store_id == target_slug:
        supplier = request.current_store
    else:
        supplier = get_object_or_404(Supplier, store_id=target_slug, is_active=True)
        
    store_id = supplier.store_id
    
    # Visit tracking (session based)
    if 'visited_products' not in request.session:
        request.session['visited_products'] = []
    
    visited_products = request.session['visited_products']
    if product.id not in visited_products:
        product.views_count += 1
        product.save(update_fields=['views_count'])
        visited_products.append(product.id)
        request.session['visited_products'] = visited_products

    user_cart = None
    if request.user.is_authenticated:
        user_cart = Cart.objects.filter(user=request.user, supplier=supplier).first() 
        if not user_cart:
            user_cart, _ = Cart.objects.get_or_create(user=request.user, supplier=supplier)
        
        # Annotate quantity
        from core.models import CartItem
        try:
            cart_item = CartItem.objects.get(cart=user_cart, product=product)
            product.quantity_in_cart = cart_item.quantity
        except CartItem.DoesNotExist:
            product.quantity_in_cart = 0
    else:
        product.quantity_in_cart = 0

    context = {
        'product': product,
        'supplier': supplier,
        'cart': user_cart,
    }

    # Fetch active platform ads (first 3) if enabled for this supplier
    if supplier.show_platform_ads:
        from core.models import PlatformOfferAd
        from django.utils import timezone
        today = timezone.now().date()
        context['platform_ads'] = PlatformOfferAd.objects.filter(
            start_date__lte=today,
            end_date__gte=today,
            is_approved=True,
            product__supplier__is_active=True
        ).order_by('order').select_related('product', 'product__supplier')[:4]

    # Calculate estimated delivery fee for mobile cart bar
    if request.user.is_authenticated:
        from core.models import Address
        from decimal import Decimal
        import math
        address = Address.objects.filter(user=request.user).first()
        estimated_fee = Decimal('0')
        if supplier.enable_delivery_fees and address and address.latitude and address.longitude and supplier.latitude and supplier.longitude:
            R = 6371
            phi1, phi2 = math.radians(float(supplier.latitude)), math.radians(float(address.latitude))
            dphi = math.radians(float(address.latitude) - float(supplier.latitude))
            dlambda = math.radians(float(address.longitude) - float(supplier.longitude))
            a = math.sin(dphi / 2)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2)**2
            estimated_distance = R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
            fee = float(estimated_distance) * float(supplier.delivery_fee_ratio or 0)
            estimated_fee = Decimal(str(fee)).quantize(Decimal('0.01'))
        context['estimated_fee'] = estimated_fee
    else:
        context['estimated_fee'] = 0

    return render(request, 'product_detail.html', context)