from django.views.generic import ListView
from core.models import * 


class OrderListView(ListView):
    model = Order
    template_name = 'order_list.html'
    context_object_name = ' m'



    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)

        # Add cart information to the context
        if self.request.user.is_authenticated:
            user_cart = Cart.objects.get(user=self.request.user)
            context['cart'] = user_cart
            orders = Order.objects.filter(user=self.request.user)
            context['orders'] = orders
        else:
            context['cart'] = None

        return context