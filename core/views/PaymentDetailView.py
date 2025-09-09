from django.views.generic import DetailView
from core.models import Payment, Cart, Product, Supplier

class PaymentDetailView(DetailView):
    model = Payment
    template_name = 'payment_detail.html'
    context_object_name = 'payment'
    
    def get_queryset(self):
        supplier_id = self.kwargs.get('supplier_id')
        category_id = self.kwargs.get('category_id')
        subcategory_id = self.kwargs.get('subcategory_id')

        queryset = Product.objects.filter(supplier_id=supplier_id)
        supplier = Supplier.objects.get(id=supplier_id)
        if subcategory_id:
            queryset = queryset.filter(category_id=subcategory_id)
        elif category_id:
            queryset = queryset.filter(category__id=category_id)

        return queryset


    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        supplier_id = self.kwargs.get('supplier_id')
        supplier = Supplier.objects.get(id=supplier_id)

        # Add cart information to the context
        if self.request.user.is_authenticated:
            user_cart = Cart.objects.get(user=self.request.user, supplier=supplier)
            context['cart'] = user_cart
        else:
            context['cart'] = None

        return context


