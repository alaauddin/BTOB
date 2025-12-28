from django.http import JsonResponse
from django.views.generic import DetailView
from django.views import View

from django.shortcuts import get_object_or_404, redirect
from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.utils.decorators import method_decorator
from core.models import Cart, Product, CartItem, Supplier, Order, OrderItem, Address
from django.contrib.auth.mixins import LoginRequiredMixin
from core.forms import ShippingAddressForm


@method_decorator(login_required, name='dispatch')
class CartView(DetailView):
    model = Cart
    template_name = 'cart_detail.html'
    context_object_name = 'cart'

    def get_object(self, queryset=None):
        supplier = get_object_or_404(Supplier, pk=self.kwargs.get('supplier_id'))
        cart, _ = Cart.objects.get_or_create(user=self.request.user, supplier=supplier)
        return cart

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        supplier = get_object_or_404(Supplier, pk=self.kwargs.get('supplier_id'))
        
        # Checkout Context
        context['supplier'] = supplier
        context['shipping_form'] = ShippingAddressForm()
        context['user_address'] = Address.objects.filter(user=self.request.user).first()
        context['total_prices'] = [item.product.price * item.quantity for item in self.object.cart_items.all()]
        
        print(supplier.id)
        return context

    def post(self, request, *args, **kwargs):
        self.object = self.get_object()
        supplier = get_object_or_404(Supplier, pk=self.kwargs.get('supplier_id'))
        form = ShippingAddressForm(request.POST)

        if form.is_valid():
            # Create Order
            # Note: Logic adapted from ConvertCartToOrder.checkout_select_address_or_custom_address
            order = Order.objects.create(
                user=request.user, 
                total_amount=self.object.get_total_amount()
            )
            
            # Create Order Items
            for cart_item in self.object.cart_items.all():
                OrderItem.objects.create(
                    order=order,
                    product=cart_item.product,
                    quantity=cart_item.quantity
                )

            # Save Shipping Address linked to Order
            address = form.save(commit=False)
            address.order = order
            # Set default values for hidden fields
            address.city = 'Sanaa'
            address.country = 'Yemen'
            address.address_type = 'Shipping'
            address.postal_code = '00000'
            address.save()

            # Check if user has a saved address, if not create one
            if not Address.objects.filter(user=request.user).exists():
                Address.objects.create(
                    user=request.user,
                    phone=address.phone,
                    address_line1=address.address_line1,
                    address_line2=address.address_line2,
                    city='Sanaa',
                    country='Yemen',
                    address_type='Shipping',
                    postal_code='00000',
                    latitude=address.latitude,
                    longitude=address.longitude
                )

            # Clear Cart
            self.object.cart_items.all().delete()
            messages.success(request, 'تم اتمام الطلب بنجاح سيتواصل معك فريق العمليات لأتمام عملية الدفع')
            return redirect('product-list',supplier_id=self.kwargs.get('supplier_id'))
        
        # If invalid, re-render cart with errors
        print("Form Errors:", form.errors) # Debugging
        context = self.get_context_data(object=self.object)
        context['shipping_form'] = form
        return self.render_to_response(context)


# @login_required
def add_to_cart(request, product_id, supplier_id):
    product = get_object_or_404(Product, pk=product_id)
    supplier = get_object_or_404(Supplier, pk=supplier_id)
    user_cart, _ = Cart.objects.get_or_create(user=request.user, supplier=supplier)

    # Check if the item is already in the cart
    cart_item, item_created = CartItem.objects.get_or_create(cart=user_cart, product=product)

    if not item_created:
        # If the item is already in the cart, update the quantity
        cart_item.quantity += 1
        cart_item.save()
    else:
        # If the item is not in the cart, create a new cart item
        cart_item.quantity = 1
        cart_item.save()

    cart_items_count = user_cart.get_total_items()
    cart_total = int(user_cart.get_total_after_discount())

    return JsonResponse({'success': True, 'message': 'Item added to cart', 'cart_items_count': cart_items_count, 'cart_item_count' : cart_item.quantity, 'cart_item_product_id': cart_item.product.id, 'cart_total': cart_total})



@login_required
def sub_to_cart(request, product_id, supplier_id):
    supplier = get_object_or_404(Supplier, pk=supplier_id)
    product = get_object_or_404(Product, pk=product_id)
    user_cart = Cart.objects.get(user=request.user, supplier=supplier)

    # Check if the item is already in the cart
    try:
        cart_item = CartItem.objects.get(cart=user_cart, product=product)
            
        if cart_item.quantity > 1:
            # If the item is already in the cart, update the quantity
            cart_item.quantity -= 1
            print(cart_item.quantity)
            cart_item.save()
        else:
            # If the item is not in the cart, create a new cart item
            cart_item.quantity = 0
            cart_item.delete()
        cart_items_count = user_cart.get_total_items()
        cart_total = int(user_cart.get_total_after_discount())

        return JsonResponse({'success': True, 'message': 'Item removed from cart', 'cart_items_count': cart_items_count, 'cart_item_count' : cart_item.quantity, 'cart_item_product_id': cart_item.product.id, 'cart_total': cart_total})



    except CartItem.DoesNotExist:
        return JsonResponse({'success': False, 'message': 'Item not in cart'})
    



 



@method_decorator(login_required, name='dispatch')
class IncreaseQuantityView(View):
    def post(self, request, item_id, *args, **kwargs):
        supplier = get_object_or_404(Supplier, pk=self.kwargs.get('supplier_id'))
        cart = get_object_or_404(Cart, user=request.user, supplier=supplier)
        cart_item = get_object_or_404(CartItem, pk=item_id, cart=cart)
        

        # Implement the logic to increase the quantity
        cart_item.quantity += 1
        cart_item.save()

        cart_total = int(cart.get_total_after_discount())
        cart_items_count = cart.get_total_items()
        new_subtotal = int(cart_item.get_subtotal_with_discount())
        new_quantity = cart_item.quantity
        new_total_discout = round(cart.get_total_ammout_with_discout(),2)

        return JsonResponse({'success': True, 'new_subtotal': new_subtotal, 'new_quantity': new_quantity, 'cart_total': cart_total, 'cart_items_count': cart_items_count,'new_total_discout':new_total_discout})

@method_decorator(login_required, name='dispatch')
class DecreaseQuantityView(View):
    def post(self, request, item_id, *args, **kwargs):
        supplier = get_object_or_404(Supplier, pk=self.kwargs.get('supplier_id'))
        cart = get_object_or_404(Cart, user=request.user, supplier=supplier)
        
        cart_item = get_object_or_404(CartItem, pk=item_id, cart__user=request.user)

        # Implement the logic to decrease the quantity
        if cart_item.quantity > 1 or cart_item.quantity == 1:
            cart_item.quantity -= 1
            cart_item.save()
        if cart_item.quantity == 0:
            cart_item.delete()
            

        cart_total = int(cart.get_total_amount())
        cart_items_count = cart.get_total_items()
        new_subtotal = int(cart_item.get_subtotal())
        new_quantity = cart_item.quantity
        new_total_discout = round(cart.get_total_ammout_with_discout(),2)
        

        return JsonResponse({'success': True, 'new_subtotal': new_subtotal, 'new_quantity': new_quantity, 'cart_total': cart_total, 'cart_items_count': cart_items_count, 'cart_item_count': cart_item.quantity,'new_total_discout':new_total_discout})

@method_decorator(login_required, name='dispatch')
class RemoveItemView(View):
    def post(self, request, item_id, *args, **kwargs):
        supplier= get_object_or_404(Supplier, pk=self.kwargs.get('supplier_id'))
        cart_item = get_object_or_404(CartItem, pk=item_id, cart__user=request.user)
        cart = get_object_or_404(Cart, user=request.user, supplier=supplier)
        # Implement the logic to remove the item
        cart_item.delete()
        cart_items_count = cart.get_total_items()

        cart_total = int(cart.get_total_amount())

        return JsonResponse({'success': True, 'cart_total': cart_total, 'cart_items_count': cart_items_count})

@login_required
def get_cart_status(request, supplier_id):
    supplier = get_object_or_404(Supplier, pk=supplier_id)
    try:
        cart = Cart.objects.get(user=request.user, supplier=supplier)
        items = [
            {'product_id': item.product.id, 'quantity': item.quantity}
            for item in cart.cart_items.all()
        ]
        return JsonResponse({
            'success': True,
            'items': items,
            'cart_items_count': cart.get_total_items()
        })
    except Cart.DoesNotExist:
        return JsonResponse({
            'success': True,
            'items': [],
            'cart_items_count': 0
        })
