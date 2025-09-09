


from django.shortcuts import render
from core.models import Cart, Supplier
from core.models import Order
from django.utils import timezone
from datetime import timedelta



def SuppliersListView(request):
    suppliers = Supplier.objects.all()
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
        
        
    
    return render(request, 'suppliers_list.html', {'suppliers': suppliers, 'pending_orders': pending_orders, 'supplier': supplier})