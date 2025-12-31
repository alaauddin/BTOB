


from django.shortcuts import render, redirect
from core.models import Cart, Supplier, SupplierCategory
from core.models import Order
from django.utils import timezone
from datetime import timedelta
from django.db.models import Q



def SuppliersListView(request):
    suppliers = Supplier.objects.all()
    
    # Check if there is only one supplier
    if suppliers.count() == 1:
        supplier = suppliers.first()
        return redirect('product-list', store_id=supplier.store_id)
    
    # Get search query for display purposes only (client-side filtering)
    q = request.GET.get('q', '').strip()
    
    # Get all categories for the filter buttons
    categories = SupplierCategory.objects.all().distinct()

    
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
        
        
    
    return render(
        request,
        'suppliers_list.html',
        {
            'suppliers': suppliers,
            'categories': categories,
            'pending_orders': pending_orders,
            'supplier': supplier,
            'q': q,
        },
    )