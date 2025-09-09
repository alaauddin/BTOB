from django.contrib.auth.mixins import LoginRequiredMixin
from django.shortcuts import get_object_or_404
from django.views.generic import ListView
from core.models import Product, Category, ProductCategory, Cart, Order, Supplier
from datetime import datetime, timedelta
from django.utils import timezone

class ProductListView(LoginRequiredMixin, ListView):
    model = Product
    template_name = 'product_list.html'
    context_object_name = 'products'
    login_url = '/login/'  # Redirect to login page if not authenticated

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

        # Cart and order context
        if self.request.user.is_authenticated:
            supplier = Supplier.objects.get(id=self.kwargs.get('supplier_id'))
            user_cart, created = Cart.objects.get_or_create(user=self.request.user, supplier=supplier)
            ten_days_ago = timezone.now() - timedelta(days=1)
            context['pending_orders'] = Order.objects.filter(
                user=self.request.user, created_at__gte=ten_days_ago, status='Pending'
            )
            context['cart'] = user_cart
        else:
            context['cart'] = None

        # Active category and supplier
        context['active_category_id'] = int(self.kwargs.get('category_id', 0)) or None
        context['active_subcategory_id'] = int(self.kwargs.get('subcategory_id', 0)) or None
        context['active_supplier_id'] = int(self.kwargs.get('supplier_id', 0)) or None

        # Include categories and product categories
        context['categories'] = Category.objects.filter(supplier=supplier)
        context['product_categories'] = ProductCategory.objects.filter(category_id=context['active_category_id'])
        context['suppliers'] = Product.objects.values('supplier_id').distinct()
        context['supplier'] = get_object_or_404(Supplier, id=context['active_supplier_id'])

        return context
