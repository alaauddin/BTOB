from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404

from core.models import Cart, CartItem, Product, Supplier, Address, Order, OrderItem, ShippingAddress
from core.utils.order_utils import complete_order_and_notify
from ..serializers import CartSerializer

class CartViewSet(viewsets.ModelViewSet):
    serializer_class = CartSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Cart.objects.filter(user=self.request.user).prefetch_related('cart_items', 'cart_items__product', 'cart_items__product__supplier')

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=False, methods=['POST'])
    def add_item(self, request):
        product_id = request.data.get('product_id')
        quantity = int(request.data.get('quantity', 1))

        if not product_id:
            return Response({'success': False, 'message': 'Product ID is required'}, status=status.HTTP_400_BAD_REQUEST)

        product = get_object_or_404(Product, id=product_id)
        supplier = product.supplier

        # Find or create a cart for this user and this specific supplier
        cart, created = Cart.objects.get_or_create(
            user=request.user,
            supplier=supplier
        )

        # Check if item already exists in cart, update quantity if so
        cart_item, item_created = CartItem.objects.get_or_create(
            cart=cart,
            product=product,
            defaults={'quantity': quantity}
        )

        if not item_created:
            cart_item.quantity += quantity
            cart_item.save()

        # Serialize and return updated cart
        serializer = self.get_serializer(cart)
        return Response({
            'success': True,
            'message': 'Product added to cart successfully',
            'cart': serializer.data
        }, status=status.HTTP_200_OK)

    @action(detail=False, methods=['GET'])
    def count(self, request):
        supplier_id_or_slug = request.query_params.get('supplier_id')
        if not supplier_id_or_slug:
            return Response({'success': False, 'message': 'Supplier ID/slug is required'}, status=status.HTTP_400_BAD_REQUEST)

        # Handle both integer IDs and string slugs
        try:
            supplier = Supplier.objects.get(id=int(supplier_id_or_slug))
        except (ValueError, Supplier.DoesNotExist):
            supplier = Supplier.objects.filter(store_id=supplier_id_or_slug).first()

        if not supplier:
            return Response({'success': True, 'count': 0})

        # Get the specific cart, return 0 if it doesn't exist
        cart = Cart.objects.filter(user=request.user, supplier=supplier).first()
        if not cart:
            return Response({'success': True, 'count': 0})

        # Calculate total item count (quantity sum)
        total_items = cart.get_total_items()
        return Response({
            'success': True,
            'count': total_items
        })

    @action(detail=False, methods=['GET'])
    def get_supplier_cart(self, request):
        supplier_id_or_slug = request.query_params.get('supplier_id')
        if not supplier_id_or_slug:
            return Response({'success': False, 'message': 'Supplier ID/slug is required'}, status=status.HTTP_400_BAD_REQUEST)

        # Handle both integer IDs and string slugs
        try:
            supplier = Supplier.objects.get(id=int(supplier_id_or_slug))
        except (ValueError, Supplier.DoesNotExist):
            supplier = Supplier.objects.filter(store_id=supplier_id_or_slug).first()

        if not supplier:
            return Response({'success': False, 'message': 'Supplier not found', 'cart': None})

        cart, created = Cart.objects.get_or_create(user=request.user, supplier=supplier)
            
        serializer = self.get_serializer(cart)
        return Response({
            'success': True,
            'cart': serializer.data,
            'cart_count': cart.get_total_items()
        })

    @action(detail=False, methods=['POST'])
    def update_quantity(self, request):
        product_id = request.data.get('product_id')
        quantity = request.data.get('quantity')
        
        if not product_id or quantity is None:
            return Response({'success': False, 'message': 'Product ID and quantity are required'}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            quantity = int(quantity)
            if quantity < 0:
                raise ValueError
        except ValueError:
            return Response({'success': False, 'message': 'Invalid quantity'}, status=status.HTTP_400_BAD_REQUEST)
            
        product = get_object_or_404(Product, id=product_id)
        supplier = product.supplier
        
        cart, created = Cart.objects.get_or_create(
            user=request.user,
            supplier=supplier
        )
        
        if quantity == 0:
            CartItem.objects.filter(cart=cart, product=product).delete()
            # If cart is empty, delete the cart
            if not cart.cart_items.exists():
                cart.delete()
                return Response({'success': True, 'message': 'Item removed, cart deleted as it was empty', 'cart': None, 'cart_count': 0})
        else:
            cart_item, item_created = CartItem.objects.get_or_create(
                cart=cart,
                product=product,
                defaults={'quantity': quantity}
            )
            if not item_created:
                cart_item.quantity = quantity
                cart_item.save()
                
        serializer = self.get_serializer(cart)
        return Response({
            'success': True,
            'message': 'Quantity updated successfully',
            'cart': serializer.data,
            'cart_count': cart.get_total_items()
        })

    @action(detail=False, methods=['GET'])
    def get_saved_address(self, request):
        address = Address.objects.filter(user=request.user).first()
        if address:
            return Response({
                'success': True,
                'address': {
                    'address_line1': address.address_line1,
                    'address_line2': address.address_line2,
                    'city': address.city,
                    'country': address.country,
                    'phone': address.phone,
                    'latitude': str(address.latitude) if address.latitude else None,
                    'longitude': str(address.longitude) if address.longitude else None,
                }
            })
        return Response({'success': False, 'message': 'No saved address found'})

    @action(detail=False, methods=['POST'])
    def checkout_registered_address(self, request):
        supplier_id = request.data.get('supplier_id')
        if not supplier_id:
            return Response({'success': False, 'message': 'Supplier ID is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        supplier = get_object_or_404(Supplier, id=supplier_id)
        
        try:
            cart = Cart.objects.get(user=request.user, supplier=supplier)
        except Cart.DoesNotExist:
            return Response({'success': False, 'message': 'السلة فارغة'}, status=status.HTTP_400_BAD_REQUEST)
            
        if not cart.cart_items.exists():
            return Response({'success': False, 'message': 'السلة فارغة'}, status=status.HTTP_400_BAD_REQUEST)
            
        user_address = Address.objects.filter(user=request.user).first()
        if not user_address:
            return Response({'success': False, 'message': 'لا يوجد عنوان مسجل. يرجى إضافة عنوان جديد.'}, status=status.HTTP_400_BAD_REQUEST)
            
        order = Order.objects.create(user=request.user, total_amount=cart.get_total_after_discount())
        for cart_item in cart.cart_items.all():
            OrderItem.objects.create(order=order, product=cart_item.product, quantity=cart_item.quantity)
            
        address_phone = user_address.phone or getattr(request.user, 'phone_number', None)
        if not address_phone:
            address_phone = 0 # fallback if no phone
            
        additional_notes = request.data.get('address_line2', '')
        custom_line2 = f"{user_address.address_line2} - {additional_notes}".strip(' -') if additional_notes and user_address.address_line2 else (additional_notes or user_address.address_line2)

        shipping_address = ShippingAddress.objects.create(
            order=order,
            phone=address_phone,
            address_line1=user_address.address_line1,
            address_line2=custom_line2,
            city=user_address.city,
            country=user_address.country,
            postal_code=user_address.postal_code,
            address_type=user_address.address_type,
            latitude=user_address.latitude,
            longitude=user_address.longitude
        )
        
        # Inject full_name into the underlying Django request so order_utils can read it
        if 'full_name' in request.data:
            request._request.POST = request._request.POST.copy()
            request._request.POST['full_name'] = request.data['full_name']

        result = complete_order_and_notify(request, order, cart, shipping_address, supplier)
        return Response(result)

    @action(detail=False, methods=['POST'])
    def checkout_custom_address(self, request):
        supplier_id = request.data.get('supplier_id')
        if not supplier_id:
            return Response({'success': False, 'message': 'Supplier ID is required'}, status=status.HTTP_400_BAD_REQUEST)
            
        supplier = get_object_or_404(Supplier, id=supplier_id)
        
        try:
            cart = Cart.objects.get(user=request.user, supplier=supplier)
        except Cart.DoesNotExist:
            return Response({'success': False, 'message': 'السلة فارغة'}, status=status.HTTP_400_BAD_REQUEST)
            
        if not cart.cart_items.exists():
            return Response({'success': False, 'message': 'السلة فارغة'}, status=status.HTTP_400_BAD_REQUEST)
            
        address_line1 = request.data.get('address_line1')
        phone = request.data.get('phone')
        
        if not address_line1 or not phone:
            return Response({'success': False, 'message': 'الموقع ورقم الهاتف مطلوبان'}, status=status.HTTP_400_BAD_REQUEST)
            
        order = Order.objects.create(user=request.user, total_amount=cart.get_total_after_discount())
        for cart_item in cart.cart_items.all():
            OrderItem.objects.create(order=order, product=cart_item.product, quantity=cart_item.quantity)
            
        lat = request.data.get('latitude')
        lng = request.data.get('longitude')
        lat = lat if lat else None
        lng = lng if lng else None
        
        shipping_address = ShippingAddress.objects.create(
            order=order,
            phone=phone,
            address_line1=address_line1,
            address_line2=request.data.get('address_line2', ''),
            city='صنعاء',
            country='اليمن',
            latitude=lat,
            longitude=lng,
            address_type='Shipping'
        )
        
        # Save as user's permanent address for next time
        address, created = Address.objects.get_or_create(user=request.user, defaults={
            'phone': phone,
            'address_line1': address_line1,
            'address_line2': request.data.get('address_line2', ''),
            'city': 'صنعاء',
            'country': 'اليمن',
            'address_type': 'Shipping',
            'latitude': lat,
            'longitude': lng
        })
        if not created:
            address.phone = phone
            address.address_line1 = address_line1
            address.address_line2 = request.data.get('address_line2', '')
            address.latitude = lat
            address.longitude = lng
            address.save()
            
        if 'full_name' in request.data:
            request._request.POST = request._request.POST.copy()
            request._request.POST['full_name'] = request.data['full_name']
            
        result = complete_order_and_notify(request, order, cart, shipping_address, supplier)
        return Response(result)
