from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required
from core.models import Supplier, Product, ProductOffer, Promotion, SuppierAds
from django.db.models import Count





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
    }
    
    return render(request, template_name, context)