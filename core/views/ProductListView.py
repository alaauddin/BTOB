from django.contrib.auth.mixins import LoginRequiredMixin
from django.shortcuts import get_object_or_404
from django.views.generic import ListView
from core.models import Product, Category, ProductCategory, Cart, Order, SuppierAds, Supplier
from datetime import datetime, timedelta
from django.utils import timezone

from django.shortcuts import render, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.utils import timezone
from datetime import timedelta

@login_required
def product_list(request, supplier_id, category_id=None, subcategory_id=None):
    # Base queryset
    queryset = Product.objects.filter(supplier_id=supplier_id)
    supplier = get_object_or_404(Supplier, id=supplier_id)

    # Filter by category or subcategory
    if subcategory_id:
        queryset = queryset.filter(category_id=subcategory_id)
    elif category_id:
        queryset = queryset.filter(category__id=category_id)
    
    supplier_ads = SuppierAds.objects.filter(supplier=supplier,is_active = True)

    # Context dictionary
    context = {
        'products': queryset,
        'active_category_id': int(category_id) if category_id else None,
        'active_subcategory_id': int(subcategory_id) if subcategory_id else None,
        'active_supplier_id': int(supplier_id),
        'supplier': supplier,
        'categories': Category.objects.filter(supplier=supplier),
        'product_categories': ProductCategory.objects.filter(category_id=category_id) if category_id else None,
        'suppliers': Product.objects.values('supplier_id').distinct(),
        'supplier_ads':supplier_ads
    }

    # Cart and pending orders

    user_cart, _ = Cart.objects.get_or_create(user=request.user, supplier=supplier)
    print(user_cart)
    one_day_ago = timezone.now() - timedelta(days=1)
    context['pending_orders'] = Order.objects.filter(
        user=request.user, created_at__gte=one_day_ago, status='Pending'
    )
    context['cart'] = user_cart


    return render(request, 'product_list.html', context)
