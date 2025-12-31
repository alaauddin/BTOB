from django.shortcuts import render, get_object_or_404
from core.models import Product, Cart, Supplier
from django.contrib.auth.decorators import login_required

# @login_required
def product_detail(request, store_id, pk):
    """Function-based view for product detail.

    Provides context similar to the previous DetailView:
    - product: Product instance (pk)
    - supplier: Supplier related to the product (if any)
    - cart: user's Cart for that supplier (or None)
    """
    product = get_object_or_404(Product, pk=pk)
    supplier = get_object_or_404(Supplier, store_id=store_id)

    user_cart = None
    if request.user.is_authenticated:
        user_cart = Cart.objects.filter(user=request.user, supplier=supplier).first() 
        if not user_cart:
            user_cart, _ = Cart.objects.get_or_create(user=request.user, supplier=supplier)
        
        # Annotate quantity
        from core.models import CartItem
        try:
            cart_item = CartItem.objects.get(cart=user_cart, product=product)
            product.quantity_in_cart = cart_item.quantity
        except CartItem.DoesNotExist:
            product.quantity_in_cart = 0
    else:
        product.quantity_in_cart = 0

    context = {
        'product': product,
        'supplier': supplier,
        'cart': user_cart,
    }

    return render(request, 'product_detail.html', context)