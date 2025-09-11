


from django.shortcuts import render
from core.models import Cart, Supplier
from core.models import Order
from django.utils import timezone
from datetime import timedelta
from django.db.models import Q



def SuppliersListView(request):
    suppliers = Supplier.objects.all()
    # Server-side search query
    q = request.GET.get('q', '').strip()
    if q:
        suppliers = suppliers.filter(
            Q(name__icontains=q)
            | Q(phone__icontains=q)
            | Q(address__icontains=q)
            | Q(city__icontains=q)
            | Q(country__icontains=q)
            | Q(category__name__icontains=q)
        )
    # if self.request.user.is_authenticated:
    #     user_cart, created = Cart.objects.get_or_create(user=self.request.user)
    #     ten_days_ago = timezone.now() - timedelta(days=1)
    #     context['pending_orders'] = Order.objects.filter(
    #         user=self.request.user, created_at__gte=ten_days_ago, status='Pending'
    #     )
    #     context['cart'] = user_cart
    # else:
    #     context['cart'] = None
    
    
    if request.user.is_authenticated:
        # user_cart, created = Cart.objects.get_or_create(user=request.user)
        ten_days_ago = timezone.now() - timedelta(days=1)
        pending_orders = Order.objects.filter(
            user=request.user, created_at__gte=ten_days_ago, status='Pending'
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
            'pending_orders': pending_orders,
            'supplier': supplier,
            'q': q,
        },
    )