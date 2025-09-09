from django.views.generic import DetailView
from core.models import Order, Cart

class OrderDetailView(DetailView):
    model = Order
    template_name = 'order_detail.html'
    context_object_name = 'order'

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        
        supplier = self.object.get_supplier()
        print(supplier)
        
        # Add cart information to the context
        if self.request.user.is_authenticated:
            user_cart = Cart.objects.get(user=self.request.user, supplier=supplier)
            context['cart'] = user_cart
            
        else:
            context['cart'] = None

        return context
