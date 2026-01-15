from django.http import JsonResponse
import logging
from django.views.generic import DetailView
from django.views import View
import math

from django.shortcuts import get_object_or_404, redirect
from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.utils.decorators import method_decorator
from core.models import Cart, Product, CartItem, Supplier, Order, OrderItem, Address
from django.contrib.auth.mixins import LoginRequiredMixin
from core.forms import ShippingAddressForm

logger = logging.getLogger(__name__)


@method_decorator(login_required, name='dispatch')
class CartView(DetailView):
    model = Cart
    template_name = 'cart_detail.html'
    context_object_name = 'cart'

    def get_object(self, queryset=None):
        supplier = get_object_or_404(Supplier, store_id=self.kwargs.get('store_id'))
        cart = Cart.objects.filter(user=self.request.user, supplier=supplier).prefetch_related('cart_items__product__additional_images').first()
        if not cart:
            cart = Cart.objects.create(user=self.request.user, supplier=supplier)
        return cart

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        supplier = get_object_or_404(Supplier, store_id=self.kwargs.get('store_id'))
        
        # Checkout Context
        context['supplier'] = supplier
        context['shipping_form'] = ShippingAddressForm()
        context['user_address'] = Address.objects.filter(user=self.request.user).first()
        context['total_prices'] = [item.product.price * item.quantity for item in self.object.cart_items.all()]

        # Calculate estimated delivery fee
        user_address = context['user_address']
        estimated_fee = 0
        estimated_distance = None
        if supplier.enable_delivery_fees and user_address and user_address.latitude and user_address.longitude and supplier.latitude and supplier.longitude:
            R = 6371
            phi1, phi2 = math.radians(float(supplier.latitude)), math.radians(float(user_address.latitude))
            dphi = math.radians(float(user_address.latitude) - float(supplier.latitude))
            dlambda = math.radians(float(user_address.longitude) - float(supplier.longitude))
            a = math.sin(dphi / 2)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2)**2
            estimated_distance = R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
            estimated_fee = float(estimated_distance) * float(supplier.delivery_fee_ratio or 0)
        
        context['estimated_fee'] = estimated_fee
        context['estimated_distance'] = estimated_distance
        return context

    def post(self, request, *args, **kwargs):
        self.object = self.get_object()
        supplier = get_object_or_404(Supplier, store_id=self.kwargs.get('store_id'))
        form = ShippingAddressForm(request.POST)

        if form.is_valid():
            # Create Order
            # Note: Logic adapted from ConvertCartToOrder.checkout_select_address_or_custom_address
            order = Order.objects.create(
                user=request.user, 
                total_amount=0 # will be calculated in set_total_amount
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
            
            # Update order total with delivery fees and discounts
            order.set_total_amount()

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
            return redirect('product-list', store_id=supplier.store_id)
        
        # If invalid, re-render cart with errors
        logger.debug("Form Errors: %s", form.errors) # Debugging
        context = self.get_context_data(object=self.object)
        context['shipping_form'] = form
        return self.render_to_response(context)


# @login_required
def add_to_cart(request, product_id, store_id):
    product = get_object_or_404(Product, pk=product_id)
    supplier = get_object_or_404(Supplier, store_id=store_id)
    user_cart, _ = Cart.objects.get_or_create(user=request.user, supplier=supplier)

    # Determine quantity to add (default 1)
    quantity_to_add = 1
    import json
    try:
        if request.body:
            data = json.loads(request.body)
            quantity_to_add = int(data.get('quantity', 1))
    except (ValueError, json.JSONDecodeError):
        pass
    
    # Ensure positive quantity
    if quantity_to_add < 1:
        quantity_to_add = 1

    # Check if the item is already in the cart
    cart_item, item_created = CartItem.objects.get_or_create(cart=user_cart, product=product)

    if not item_created:
        # If the item is already in the cart, update the quantity
        cart_item.quantity += quantity_to_add
        cart_item.save()
    else:
        # If the item is not in the cart, create a new cart item
        cart_item.quantity = quantity_to_add
        cart_item.save()

    cart_items_count = user_cart.get_total_items()
    cart_total = int(user_cart.get_total_after_discount())

    return JsonResponse({'success': True, 'message': 'Item added to cart', 'cart_items_count': cart_items_count, 'cart_item_count' : cart_item.quantity, 'cart_item_product_id': cart_item.product.id, 'cart_total': cart_total})



@login_required
def sub_to_cart(request, product_id, store_id):
    supplier = get_object_or_404(Supplier, store_id=store_id)
    product = get_object_or_404(Product, pk=product_id)
    user_cart = Cart.objects.get(user=request.user, supplier=supplier)

    # Check if the item is already in the cart
    try:
        cart_item = CartItem.objects.get(cart=user_cart, product=product)
            
        if cart_item.quantity > 1:
            # If the item is already in the cart, update the quantity
            cart_item.quantity -= 1
            logger.debug(cart_item.quantity)
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
        supplier = get_object_or_404(Supplier, store_id=self.kwargs.get('store_id'))
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
        supplier = get_object_or_404(Supplier, store_id=self.kwargs.get('store_id'))
        cart = get_object_or_404(Cart, user=request.user, supplier=supplier)
        
        cart_item = get_object_or_404(CartItem, pk=item_id, cart__user=request.user)

        # Implement the logic to decrease the quantity
        if cart_item.quantity > 1 or cart_item.quantity == 1:
            cart_item.quantity -= 1
            cart_item.save()
        if cart_item.quantity == 0:
            cart_item.delete()
            

        # Use get_total_after_discount to respect offers
        cart_total = int(cart.get_total_after_discount())
        cart_items_count = cart.get_total_items()
        new_subtotal = int(cart_item.get_subtotal())
        new_quantity = cart_item.quantity
        new_total_discout = round(cart.get_total_ammout_with_discout(),2)
        

        return JsonResponse({'success': True, 'new_subtotal': new_subtotal, 'new_quantity': new_quantity, 'cart_total': cart_total, 'cart_items_count': cart_items_count, 'cart_item_count': cart_item.quantity,'new_total_discout':new_total_discout})

@method_decorator(login_required, name='dispatch')
class RemoveItemView(View):
    def post(self, request, item_id, *args, **kwargs):
        supplier= get_object_or_404(Supplier, store_id=self.kwargs.get('store_id'))
        cart_item = get_object_or_404(CartItem, pk=item_id, cart__user=request.user)
        cart = get_object_or_404(Cart, user=request.user, supplier=supplier)
        # Implement the logic to remove the item
        cart_item.delete()
        cart_items_count = cart.get_total_items()

        cart_items_count = cart.get_total_items()

        # Use get_total_after_discount to respect offers
        cart_total = int(cart.get_total_after_discount())
        new_total_discout = round(cart.get_total_ammout_with_discout(),2)

        return JsonResponse({'success': True, 'cart_total': cart_total, 'cart_items_count': cart_items_count, 'new_total_discout': new_total_discout})

@login_required
def get_cart_status(request, store_id):
    supplier = get_object_or_404(Supplier, store_id=store_id)
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
