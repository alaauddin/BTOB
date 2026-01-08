from django.contrib.auth.mixins import LoginRequiredMixin
import math
from decimal import Decimal
from django.shortcuts import get_object_or_404
from django.views.generic import ListView
from core.models import Product, Category, ProductCategory, Cart, Order, SuppierAds, Supplier, Address, ProductOffer
from datetime import datetime, timedelta
from django.utils import timezone
from django.db.models import Exists, OuterRef, Subquery

from django.shortcuts import render, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.utils import timezone
from datetime import timedelta

# @login_required <-- Removed for public access
def product_list(request, store_id, category_id=None, subcategory_id=None):
    # Base queryset
    supplier = get_object_or_404(Supplier, store_id=store_id)
    today = timezone.now().date()
    
    # Visit tracking (session based)
    if 'visited_suppliers' not in request.session:
        request.session['visited_suppliers'] = []
    
    visited_suppliers = request.session['visited_suppliers']
    if supplier.id not in visited_suppliers:
        supplier.views_count += 1
        supplier.save(update_fields=['views_count'])
        visited_suppliers.append(supplier.id)
        request.session['visited_suppliers'] = visited_suppliers
    
    # Subquery for active offers
    active_offers = ProductOffer.objects.filter(
        product=OuterRef('pk'),
        is_active=True,
        from_date__lte=today,
        to_date__gte=today
    )
    
    queryset = Product.objects.filter(supplier=supplier, is_active=True).annotate(
        has_active_offer=Exists(active_offers),
        max_discount=Subquery(
            active_offers.order_by('-discount_precentage').values('discount_precentage')[:1]
        )
    )

    # Filter by category or subcategory
    if subcategory_id:
        queryset = queryset.filter(category_id=subcategory_id)
    elif category_id:
        queryset = queryset.filter(category__id=category_id)
    
    # Sort and Partition logic
    queryset = queryset.order_by('-has_active_offer', '-max_discount', '-is_new', '-id')
    
    # Partition lists
    offer_products = []
    new_products = []
    other_products = []
    
    for product in queryset:
        if product.has_active_offer:
            offer_products.append(product)
        elif product.is_new:
            new_products.append(product)
        else:
            other_products.append(product)

    supplier_ads = SuppierAds.objects.filter(supplier=supplier,is_active = True)

    # Context dictionary
    context = {
        'products': queryset, # Keep for backward compat if needed, or remove
        'offer_products': offer_products,
        'new_products': new_products,
        'other_products': other_products,
        'active_category_id': int(category_id) if category_id else None,
        'active_subcategory_id': int(subcategory_id) if subcategory_id else None,
        'active_store_id': store_id,
        'supplier': supplier,
        'categories': Category.objects.filter(productcategory__products__supplier=supplier).distinct(),
        'product_categories': ProductCategory.objects.filter(category_id=category_id, products__supplier=supplier).distinct() if category_id else None,
        'suppliers': Product.objects.values('supplier_id').distinct(),
        'supplier_ads':supplier_ads
    }

    # Cart and pending orders
    if request.user.is_authenticated:
        user_cart, _ = Cart.objects.get_or_create(user=request.user, supplier=supplier)
        print(user_cart)
        one_day_ago = timezone.now() - timedelta(days=1)
        context['pending_orders'] = Order.objects.filter(
            user=request.user, created_at__gte=one_day_ago, pipeline_status__slug='pending'
        )
        context['cart'] = user_cart
        
        # Calculate estimated delivery fee for mobile cart bar
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
        context['cart'] = None
        context['pending_orders'] = None
        context['estimated_fee'] = 0


    return render(request, 'product_list.html', context)
