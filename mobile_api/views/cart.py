from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
import json

from core.models import Cart, CartItem, Product, Supplier, Address, Order, OrderItem, ShippingAddress
from core.utils.order_utils import complete_order_and_notify
from ..serializers import CartSerializer

class CartViewSet(viewsets.ModelViewSet):
    serializer_class = CartSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Cart.objects.filter(user=self.request.user).prefetch_related('cart_items', 'cart_items__product', 'cart_items__product__supplier')

    def _validate_variations(self, product, selected_option_ids):
        """
        Helper to ensure all product attributes have a selected option.
        Returns (is_valid, data) where data is clean_option_ids or error_msg
        """
        product_attributes = product.attributes.all()
        if not product_attributes.exists():
            return True, []
            
        from core.models import ProductAttributeOption
        # Standardize option IDs (supports list and JSON string)
        if isinstance(selected_option_ids, str):
            try:
                selected_option_ids = json.loads(selected_option_ids)
            except:
                selected_option_ids = [selected_option_ids] if selected_option_ids else []
                
        try:
            clean_option_ids = sorted([int(oid) for oid in selected_option_ids if str(oid).isdigit()])
        except (ValueError, TypeError):
            clean_option_ids = []
            
        selected_options_data = ProductAttributeOption.objects.filter(
            id__in=clean_option_ids, 
            attribute__product=product
        ).values_list('attribute_id', flat=True)
        
        selected_attribute_ids = set(selected_options_data)
        required_attribute_ids = set(product_attributes.values_list('id', flat=True))
        
        missing_attribute_ids = required_attribute_ids - selected_attribute_ids
        
        if missing_attribute_ids:
            missing_names = product_attributes.filter(id__in=missing_attribute_ids).values_list('name', flat=True)
            missing_str = ", ".join(missing_names)
            return False, f'الرجاء اختيار: ({missing_str})'
            
        return True, clean_option_ids

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=False, methods=['POST'])
    def add_item(self, request):
        product_id = request.data.get('product_id')
        quantity = int(request.data.get('quantity', 1))
        selected_option_ids = request.data.get('selected_options', [])

        if not product_id:
            return Response({'success': False, 'message': 'Product ID is required'}, status=status.HTTP_400_BAD_REQUEST)

        product = get_object_or_404(Product, id=product_id)
        supplier = product.supplier

        # Enforce variations
        is_valid, validated_data = self._validate_variations(product, selected_option_ids)
        if not is_valid:
            return Response({'success': False, 'message': validated_data}, status=status.HTTP_400_BAD_REQUEST)
        
        clean_option_ids = validated_data # Use cleaned sorted IDs

        # Find or create a cart for this user and this specific supplier
        cart, created = Cart.objects.get_or_create(
            user=request.user,
            supplier=supplier
        )

        # To handle variations correctly, we check for a CartItem that has the SAME product 
        # AND the EXACT SAME selected options.
        cart_items = CartItem.objects.filter(cart=cart, product=product)
        target_item = None
        for item in cart_items:
            item_option_ids = sorted(list(item.selected_options.values_list('id', flat=True)))
            if item_option_ids == clean_option_ids:
                target_item = item
                break
        
        if target_item:
            target_item.quantity += quantity
            # Update prices on each add (locking at current price)
            target_item.price = product.price
            target_item.discount_price = product.get_price_with_offer()
            target_item.price_modifier_total = sum([opt.price_modifier for opt in target_item.selected_options.all()])
            target_item.save()
        else:
            target_item = CartItem.objects.create(
                cart=cart,
                product=product,
                quantity=quantity,
                price=product.price,
                discount_price=product.get_price_with_offer()
            )
            if clean_option_ids:
                from core.models import ProductAttributeOption
                options = ProductAttributeOption.objects.filter(id__in=clean_option_ids)
                target_item.selected_options.set(options)
                # Calculate modifier after setting
                target_item.price_modifier_total = sum([opt.price_modifier for opt in options])
                target_item.save()

        return Response({
            'success': True,
            'message': 'Product added to cart successfully',
            'cart_item_count': target_item.quantity,
            'cart_count': cart.get_total_items()
        })

    @action(detail=False, methods=['GET'])
    def count(self, request):
        supplier_id_or_slug = request.query_params.get('supplier_id')
        if not supplier_id_or_slug:
            return Response({'success': False, 'message': 'Supplier ID/slug is required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            supplier = Supplier.objects.get(id=int(supplier_id_or_slug))
        except (ValueError, Supplier.DoesNotExist):
            supplier = Supplier.objects.filter(store_id=supplier_id_or_slug).first()

        if not supplier:
            return Response({'success': True, 'count': 0})

        cart = Cart.objects.filter(user=request.user, supplier=supplier).first()
        if not cart:
            return Response({'success': True, 'count': 0})

        total_items = cart.get_total_items()
        return Response({
            'success': True,
            'count': total_items
        })

    @action(detail=False, methods=['GET', 'POST'])
    def get_item_quantity(self, request):
        """
        Returns the quantity of a specific product variant in the cart.
        """
        data = request.data if request.method == 'POST' else request.query_params
        product_id = data.get('product_id')
        selected_option_ids = data.get('selected_options', [])
        
        if not product_id:
            return Response({'success': False, 'message': 'Product ID is required'}, status=status.HTTP_400_BAD_REQUEST)

        product = get_object_or_404(Product, id=product_id)
        supplier = product.supplier
        
        # We use the same variation validator to get clean IDs
        is_valid, validated_data = self._validate_variations(product, selected_option_ids)
        # Even if not fully valid (partial selection), we can try to find a match if the user somehow has it 
        # But usually we only care if it's a full match.
        clean_option_ids = validated_data if is_valid else []

        cart = Cart.objects.filter(user=request.user, supplier=supplier).first()
        if not cart:
            return Response({'success': True, 'quantity': 0, 'cart_count': 0})

        cart_items = cart.cart_items.filter(product=product)
        target_item = None
        for item in cart_items:
            item_option_ids = sorted(list(item.selected_options.values_list('id', flat=True)))
            if item_option_ids == clean_option_ids:
                target_item = item
                break
        
        return Response({
            'success': True,
            'quantity': target_item.quantity if target_item else 0,
            'cart_count': cart.get_total_items()
        })

    @action(detail=False, methods=['GET'])
    def get_supplier_cart(self, request):
        supplier_id_or_slug = request.query_params.get('supplier_id')
        if not supplier_id_or_slug:
            return Response({'success': False, 'message': 'Supplier detail is required'}, status=status.HTTP_400_BAD_REQUEST)
        
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
        selected_option_ids = request.data.get('selected_options', [])
        
        if not product_id or quantity is None:
            return Response({'success': False, 'message': 'Product ID and quantity are required'}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            quantity = int(quantity)
        except ValueError:
            return Response({'success': False, 'message': 'Invalid quantity'}, status=status.HTTP_400_BAD_REQUEST)
            
        product = get_object_or_404(Product, id=product_id)
        supplier = product.supplier
        
        # Enforce variations ONLY if we are setting quantity > 0
        if quantity > 0:
            is_valid, validated_data = self._validate_variations(product, selected_option_ids)
            if not is_valid:
                return Response({'success': False, 'message': validated_data}, status=status.HTTP_400_BAD_REQUEST)
            clean_option_ids = validated_data
        else:
            # For deletion, we just need to match whatever IDs were passed
            try:
                if isinstance(selected_option_ids, str):
                    selected_option_ids = json.loads(selected_option_ids)
                clean_option_ids = sorted([int(oid) for oid in selected_option_ids if str(oid).isdigit()])
            except:
                clean_option_ids = []

        cart, created = Cart.objects.get_or_create(user=request.user, supplier=supplier)
        
        # Match specific variation
        cart_items = CartItem.objects.filter(cart=cart, product=product)
        target_item = None
        for item in cart_items:
            item_option_ids = sorted(list(item.selected_options.values_list('id', flat=True)))
            if item_option_ids == clean_option_ids:
                target_item = item
                break
                
        if quantity == 0:
            if target_item:
                target_item.delete()
            return Response({'success': True, 'message': 'تم حذف المنتج من السلة', 'cart_count': cart.get_total_items()})
        
        if target_item:
            target_item.quantity = quantity
            target_item.save()
        else:
            # Create new if didn't exist for this variation
            target_item = CartItem.objects.create(
                cart=cart,
                product=product,
                quantity=quantity,
                price=product.price,
                discount_price=product.get_price_with_offer()
            )
            if clean_option_ids:
                from core.models import ProductAttributeOption
                options = ProductAttributeOption.objects.filter(id__in=clean_option_ids)
                target_item.selected_options.set(options)
                target_item.price_modifier_total = sum([opt.price_modifier for opt in options])
                target_item.save()

        return Response({
            'success': True,
            'message': 'تم تحديث الكمية بنجاح',
            'quantity': target_item.quantity,
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
            
        # Create order with placeholder total
        order = Order.objects.create(user=request.user, total_amount=0)
        
        for cart_item in cart.cart_items.all():
            order_item = OrderItem.objects.create(
                order=order, 
                product=cart_item.product, 
                quantity=cart_item.quantity,
                price=cart_item.price or cart_item.product.price,
                discount_price=cart_item.discount_price or cart_item.product.get_price_with_offer(),
                price_modifier_total=cart_item.price_modifier_total or 0
            )
            if cart_item.selected_options.exists():
                order_item.selected_options.set(cart_item.selected_options.all())
            
        address_phone = user_address.phone or getattr(request.user, 'phone_number', None)
        if not address_phone:
            address_phone = 0
            
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
        
        order.set_total_amount()
        
        if 'full_name' in request.data:
            request._request.POST = request._request.POST.copy()
            request._request.POST['full_name'] = request.data['full_name']

        payment_method_id = request.data.get('payment_method_id')
        receipt = request.FILES.get('receipt')

        result = complete_order_and_notify(request, order, cart, shipping_address, supplier, payment_method_id, receipt)
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
            
        order = Order.objects.create(user=request.user, total_amount=0)
        
        for cart_item in cart.cart_items.all():
            order_item = OrderItem.objects.create(
                order=order, 
                product=cart_item.product, 
                quantity=cart_item.quantity,
                price=cart_item.price or cart_item.product.price,
                discount_price=cart_item.discount_price or cart_item.product.get_price_with_offer(),
                price_modifier_total=cart_item.price_modifier_total or 0
            )
            if cart_item.selected_options.exists():
                order_item.selected_options.set(cart_item.selected_options.all())
            
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
        
        order.set_total_amount()
        
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

        payment_method_id = request.data.get('payment_method_id')
        receipt = request.FILES.get('receipt')
            
        result = complete_order_and_notify(request, order, cart, shipping_address, supplier, payment_method_id, receipt)
        return Response(result)
