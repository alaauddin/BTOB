from django.views.generic import DetailView
from core.models import Product, Cart, Supplier

class ProductDetailView(DetailView):
    model = Product
    template_name = 'product_detail.html'
    context_object_name = 'product'

    
 
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        supplier_id = self.kwargs.get('pk')
        supplier = Supplier.objects.get(products__id=supplier_id)
        # Add cart information to the context
        if self.request.user.is_authenticated:
            user_cart = Cart.objects.get(user=self.request.user, supplier=supplier) 
            context['cart'] = user_cart
        else:
            context['cart'] = None

        return context