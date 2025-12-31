from django.shortcuts import render, get_object_or_404
from core.models import Product, Cart, Supplier
from django.contrib.auth.decorators import login_required

# @login_required
def product_detail(request, pk):
    """Function-based view for product detail.

    Provides context similar to the previous DetailView:
    - product: Product instance (pk)
    - supplier: Supplier related to the product (if any)
    - cart: user's Cart for that supplier (or None)
    """
    product = get_object_or_404(Product, pk=pk)

    # Try to get supplier directly from product if it has a FK, otherwise fall back
    supplier = Supplier.objects.filter(id=product.supplier_id).first()
    if not supplier:
        supplier = Supplier.objects.filter(products__id=product.id).first()

    user_cart = None
    if request.user.is_authenticated:
        user_cart = Cart.objects.filter(user=request.user, supplier=supplier).first() 
        if not user_cart:
            user_cart, _ = Cart.objects.get_or_create(user=request.user, supplier=supplier)

    context = {
        'product': product,
        'supplier': supplier,
        'cart': user_cart,
    }

    return render(request, 'product_detail.html', context)