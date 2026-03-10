from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.utils.crypto import get_random_string
from rest_framework_simplejwt.tokens import RefreshToken

from .serializers import (
    LoginSerializer, SignupSerializer, 
    UnifiedAuthSerializer, UserSerializer,
    PasswordResetRequestSerializer
)
from core.models import SystemSettings
# Assuming send_whatsapp_message is available
# from core.utils.whatsapp_utils import send_whatsapp_message

def get_tokens_for_user(user):
    refresh = RefreshToken.for_user(user)
    return {
        'refresh': str(refresh),
        'access': str(refresh.access_token),
    }

import logging
logger = logging.getLogger('core')


def _get_manageable_merchants(user):
    """
    Return the QuerySet of Supplier instances this user can manage.
    - Superusers can manage every merchant.
    - Regular users qualify if they are the owner (user.supplier)
      or listed in Supplier.managing_users.
    """
    from core.models import Supplier
    from django.db.models import Q
    if user.is_superuser:
        return Supplier.objects.filter(is_active=True)
    return Supplier.objects.filter(
        Q(user=user) | Q(managing_users=user)
    ).distinct()


def _merchant_list_data(user, merchants, request=None):
    """Serialize the list of manageable merchants into lightweight dicts.
    Pass `request` so image fields are returned as absolute URLs.
    """
    from .serializers import MerchantMiniSerializer
    context = {'request': request} if request else {}
    return MerchantMiniSerializer(merchants, many=True, context=context).data


class LoginAPIView(APIView):
    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if serializer.is_valid():
            user = authenticate(
                username=serializer.validated_data['username'],
                password=serializer.validated_data['password']
            )
            if user:
                manageable = _get_manageable_merchants(user)
                is_merchant = user.is_superuser or manageable.exists()

                if not is_merchant:
                    return Response({
                        'success': False,
                        'message': 'Access Denied: You must be a Merchant or Manager to login here.'
                    }, status=status.HTTP_403_FORBIDDEN)

                tokens = get_tokens_for_user(user)
                merchant_data = _merchant_list_data(user, manageable, request)
                active_merchant_id = merchant_data[0]['id'] if merchant_data else None

                return Response({
                    'success': True,
                    'message': 'Login successful',
                    'tokens': tokens,
                    'user': UserSerializer(user).data,
                    'user_scope': 'merchant',
                    'manageable_merchants': merchant_data,
                    'active_merchant_id': active_merchant_id,
                })
            return Response({'success': False, 'message': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class SignupAPIView(APIView):
    def post(self, request):
        serializer = SignupSerializer(data=request.data)
        if serializer.is_valid():
            username = serializer.validated_data['username']
            if User.objects.filter(username=username).exists():
                return Response({'success': False, 'message': 'Username already exists'}, status=status.HTTP_400_BAD_REQUEST)
            
            user = User.objects.create_user(
                username=username,
                email=f"{username}@aratatt.com",
                password=serializer.validated_data['password'],
                first_name=serializer.validated_data.get('first_name', '')
            )
            tokens = get_tokens_for_user(user)
            return Response({
                'success': True,
                'message': 'Signup successful',
                'tokens': tokens,
                'user': UserSerializer(user).data
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

import re

class UnifiedAuthAPIView(APIView):
    def post(self, request):
        serializer = UnifiedAuthSerializer(data=request.data)
        if serializer.is_valid():
            raw_phone = serializer.validated_data['phone']
            
            # Yemeni Phone Normalization & Validation logic
            # Remove any spaces, hyphens, or brackets
            normalized = re.sub(r'[\s\-\(\)]', '', raw_phone)
            
            # Strip standard Yemeni prefixes for normalization
            if normalized.startswith('+967'):
                normalized = normalized[4:]
            elif normalized.startswith('00967'):
                normalized = normalized[5:]
            
            # Now we should have exactly 9 digits starting with 7
            if not (len(normalized) == 9 and normalized.startswith('7')):
                return Response({
                    'success': False,
                    'message': 'Invalid Yemeni phone format. Example: +967 77X XXX XXX'
                }, status=status.HTTP_400_BAD_REQUEST)
                
            # Formatting as standard prefixed username for the database
            normalized_username = f"+967{normalized}"

            user = User.objects.filter(username=normalized_username).first()
            # Also check if they mistakenly exist without prefix just in case
            if not user:
                 user = User.objects.filter(username=normalized).first()
            
            if user:
                tokens = get_tokens_for_user(user)
                return Response({
                    'success': True,
                    'message': 'Login successful',
                    'is_new': False,
                    'tokens': tokens,
                    'user': UserSerializer(user).data
                })
            else:
                random_password = get_random_string(length=12)
                user = User.objects.create_user(
                    username=normalized_username,
                    email=f"{normalized_username}@aratatt.com",
                    password=random_password,
                    first_name=""
                )
                tokens = get_tokens_for_user(user)
                return Response({
                    'success': True,
                    'message': 'Signup successful',
                    'is_new': True,
                    'tokens': tokens,
                    'user': UserSerializer(user).data
                }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

# --- Core Views ---
from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from django.utils import timezone
from django.db.models import Q, Max, Count, OuterRef, Exists, Subquery
from .serializers import (
    SupplierSerializer, ProductSerializer, 
    CartSerializer, OrderSerializer
)
from core.models import Supplier, Product, Cart, Order

class SupplierViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = SupplierSerializer

    def get_queryset(self):
        today = timezone.now().date()
        
        # Annotate suppliers with max discount and offers count to sort by "strongest offers"
        # Mirroring SuppliersListView logic
        suppliers = Supplier.objects.filter(is_active=True).annotate(
            max_offer_discount=Max(
                'products__products_offer__discount_precentage',
                filter=Q(
                    products__products_offer__is_active=True,
                    products__products_offer__from_date__lte=today,
                    products__products_offer__to_date__gte=today
                )
            ),
            offers_count=Count(
                'products__products_offer',
                filter=Q(
                    products__products_offer__is_active=True,
                    products__products_offer__from_date__lte=today,
                    products__products_offer__to_date__gte=today
                ),
                distinct=True
            )
        ).order_by('-max_offer_discount', '-offers_count', '-priority')
        
        return suppliers

class HomeAPIView(APIView):
    def get(self, request):
        today = timezone.now().date()
        
        # 1. Categories
        from core.models import SupplierCategory, SupplierAdPlatfrom, PlatformOfferAd
        from .serializers import SupplierCategorySerializer, SupplierSerializer
        from .serializers import SupplierAdSerializer, PlatformOfferAdSerializer
        
        categories = SupplierCategory.objects.all()
        
        # 2. Supplier Ads (Full Width Top)
        supplier_ads = SupplierAdPlatfrom.objects.filter(
            is_active=True,
            approved=True,
            start_datetime__lte=timezone.now(),
            end_datetime__gte=timezone.now()
        ).select_related('supplier')
        
        # 3. Platform Offer Ads (Horizontal Scroll)
        platform_ads = PlatformOfferAd.objects.filter(
            start_date__lte=today,
            end_date__gte=today,
            is_approved=True,
            product__supplier__is_active=True
        ).order_by('order').select_related('product', 'product__supplier')
        
        # 4. Producing Family Suppliers
        producing_family_suppliers = Supplier.objects.filter(category__producing_family=True, is_active=True).annotate(
            max_offer_discount=Max(
                'products__products_offer__discount_precentage',
                filter=Q(
                    products__products_offer__is_active=True,
                    products__products_offer__from_date__lte=today,
                    products__products_offer__to_date__gte=today
                )
            ),
            offers_count=Count(
                'products__products_offer',
                filter=Q(
                    products__products_offer__is_active=True,
                    products__products_offer__from_date__lte=today,
                    products__products_offer__to_date__gte=today
                ),
                distinct=True
            )
        ).distinct().order_by('-max_offer_discount', '-priority')
        
        # 5. All Suppliers (Same Logic as SupplierViewSet)
        all_suppliers = Supplier.objects.filter(is_active=True).annotate(
            max_offer_discount=Max(
                'products__products_offer__discount_precentage',
                filter=Q(
                    products__products_offer__is_active=True,
                    products__products_offer__from_date__lte=today,
                    products__products_offer__to_date__gte=today
                )
            ),
            offers_count=Count(
                'products__products_offer',
                filter=Q(
                    products__products_offer__is_active=True,
                    products__products_offer__from_date__lte=today,
                    products__products_offer__to_date__gte=today
                ),
                distinct=True
            )
        ).order_by('-max_offer_discount', '-offers_count', '-priority')
        
        # Serialize all and return together
        return Response({
            'success': True,
            'categories': SupplierCategorySerializer(categories, many=True, context={'request': request}).data,
            'supplier_ads': SupplierAdSerializer(supplier_ads, many=True, context={'request': request}).data,
            'platform_ads': PlatformOfferAdSerializer(platform_ads, many=True, context={'request': request}).data,
            'producing_families': SupplierSerializer(producing_family_suppliers, many=True, context={'request': request}).data,
            'all_suppliers': SupplierSerializer(all_suppliers, many=True, context={'request': request}).data,
        })

class StoreProfileAPIView(APIView):
    def get(self, request, store_id):
        from core.models import Supplier, Product, SupplierAds, ProductOffer
        from .serializers import SupplierSerializer, ProductSerializer
        from django.shortcuts import get_object_or_404
        
        supplier = get_object_or_404(Supplier, store_id=store_id, is_active=True)
        today = timezone.now().date()
        
        # Supplier Ads
        supplier_ads = SupplierAds.objects.filter(supplier=supplier, is_active=True)
        # Note: We don't have a SupplierAdsSerializer yet, using basic dict or we can just send image urls
        
        # Product grouping logic (mirroring web ProductListView)
        active_offers = ProductOffer.objects.filter(
            product=OuterRef('pk'),
            is_active=True,
            from_date__lte=today,
            to_date__gte=today
        )
        
        products = Product.objects.filter(supplier=supplier, is_active=True).annotate(
            has_active_offer=Exists(active_offers),
            max_discount=Subquery(
                active_offers.order_by('-discount_precentage').values('discount_precentage')[:1]
            )
        )
        
        if not supplier.show_out_of_stock:
            products = products.filter(stock__gt=0)
            
        products = products.order_by('-has_active_offer', '-max_discount', '-is_new', '-id')
        
        offer_products = []
        new_products = []
        other_products = []
        
        for product in products:
            if product.has_active_offer:
                offer_products.append(product)
            elif product.is_new:
                new_products.append(product)
            else:
                other_products.append(product)
                
        # Simple serialization for ads
        ads_data = [{'id': ad.id, 'image': request.build_absolute_uri(ad.image.url) if ad.image else None} for ad in supplier_ads]
            
        return Response({
            'success': True,
            'supplier': SupplierSerializer(supplier, context={'request': request}).data,
            'supplier_ads': ads_data,
            'offer_products': ProductSerializer(offer_products, many=True, context={'request': request}).data,
            'new_products': ProductSerializer(new_products, many=True, context={'request': request}).data,
            'other_products': ProductSerializer(other_products, many=True, context={'request': request}).data,
        })


class ProductViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    
    def get_serializer_context(self):
        context = super().get_serializer_context()
        context.update({"request": self.request})
        return context

    def get_queryset(self):
        queryset = super().get_queryset()
        store_id = self.request.query_params.get('store_id')
        if store_id:
            queryset = queryset.filter(supplier__store_id=store_id)
        return queryset

from rest_framework.decorators import action
from django.shortcuts import get_object_or_404
from core.models import Product, CartItem, Address, ShippingAddress, OrderItem
from core.utils.order_utils import complete_order_and_notify

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
        except ValueError:
            supplier = Supplier.objects.filter(store_id=supplier_id_or_slug).first()
        except Supplier.DoesNotExist:
            supplier = None

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
        except ValueError:
            supplier = Supplier.objects.filter(store_id=supplier_id_or_slug).first()
        except Supplier.DoesNotExist:
            supplier = None

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

class OrderViewSet(viewsets.ModelViewSet):
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Order.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

from core.models import Category
from .serializers import CategorySerializer

class CategoryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer


# ── Merchant Management Views ─────────────────────────────────────────────────

from .serializers import MerchantMiniSerializer, MerchantOrderSerializer
from django.core.paginator import Paginator


def _assert_merchant_access(user, merchant_id):
    """
    Validate that `user` can manage the given merchant.
    - Superusers have access to any merchant.
    - Regular users must be the owner or a managing user.
    Returns (supplier, error_response) — one will be None.
    """
    from core.models import Supplier
    from django.db.models import Q
    if user.is_superuser:
        supplier = Supplier.objects.filter(id=merchant_id).first()
    else:
        supplier = Supplier.objects.filter(
            Q(user=user) | Q(managing_users=user), id=merchant_id
        ).first()
    if not supplier:
        return None, Response(
            {'success': False, 'message': 'Merchant not found or access denied.'},
            status=status.HTTP_403_FORBIDDEN,
        )
    return supplier, None


def _build_dashboard_stats(supplier):
    """Compute KPI dashboard stats for a supplier. Returns a dict."""
    from django.utils import timezone
    from django.db.models import Sum
    from core.models import Order, Product

    today = timezone.now().date()
    supplier_orders = Order.objects.filter(
        order_items__product__supplier=supplier
    ).distinct()
    revenue = (
        supplier_orders
        .filter(created_at__year=today.year, created_at__month=today.month)
        .aggregate(total=Sum('total_amount'))['total'] or 0
    )
    return {
        'orders_today': supplier_orders.filter(created_at__date=today).count(),
        'orders_this_month': supplier_orders.filter(
            created_at__year=today.year, created_at__month=today.month
        ).count(),
        'revenue_this_month': str(revenue),
        'pending_orders': supplier_orders.filter(pipeline_status__slug='pending').count(),
        'total_products': Product.objects.filter(supplier=supplier, is_active=True).count(),
        'low_stock_count': Product.objects.filter(
            supplier=supplier, is_active=True, stock__lt=5
        ).count(),
    }


def _recent_orders_qs(supplier, limit=10):
    """Return a QuerySet of the most recent orders for a supplier."""
    from core.models import Order
    return (
        Order.objects
        .filter(order_items__product__supplier=supplier)
        .distinct()
        .select_related('user', 'pipeline_status')
        .prefetch_related(
            'order_items__product',
            'order_items__product__additional_images',
            'shippingaddress_set',
        )
        .order_by('-created_at')[:limit]
    )


class MerchantDashboardAPIView(APIView):
    """GET /merchant/dashboard/?merchant_id=<id> — KPI stats + recent orders."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        merchant_id = request.query_params.get('merchant_id')
        if not merchant_id:
            return Response({'success': False, 'message': 'merchant_id is required.'}, status=status.HTTP_400_BAD_REQUEST)
        supplier, err = _assert_merchant_access(request.user, merchant_id)
        if err:
            return err
        all_merchants = _get_manageable_merchants(request.user)
        return Response({
            'success': True,
            'merchant': MerchantMiniSerializer(supplier, context={'request': request}).data,
            'manageable_merchants': _merchant_list_data(request.user, all_merchants, request),
            'stats': _build_dashboard_stats(supplier),
            'recent_orders': MerchantOrderSerializer(
                _recent_orders_qs(supplier), many=True, context={'request': request}
            ).data,
        })


class MerchantSwitchAPIView(APIView):
    """POST /merchant/switch/  {merchant_id} — switch active merchant, return fresh dashboard."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        merchant_id = request.data.get('merchant_id')
        if not merchant_id:
            return Response({'success': False, 'message': 'merchant_id is required.'}, status=status.HTTP_400_BAD_REQUEST)
        supplier, err = _assert_merchant_access(request.user, merchant_id)
        if err:
            return err
        all_merchants = _get_manageable_merchants(request.user)
        return Response({
            'success': True,
            'active_merchant_id': supplier.id,
            'merchant': MerchantMiniSerializer(supplier, context={'request': request}).data,
            'manageable_merchants': _merchant_list_data(request.user, all_merchants, request),
            'stats': _build_dashboard_stats(supplier),
            'recent_orders': MerchantOrderSerializer(
                _recent_orders_qs(supplier), many=True, context={'request': request}
            ).data,
        })


class MerchantOrdersAPIView(APIView):
    """GET /merchant/orders/?merchant_id=<id>&status=<slug>&page=<n> — paginated orders."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        merchant_id = request.query_params.get('merchant_id')
        if not merchant_id:
            return Response({'success': False, 'message': 'merchant_id is required.'}, status=status.HTTP_400_BAD_REQUEST)
        supplier, err = _assert_merchant_access(request.user, merchant_id)
        if err:
            return err

        from core.models import Order
        qs = (
            Order.objects
            .filter(order_items__product__supplier=supplier)
            .distinct()
            .select_related('user', 'pipeline_status')
            .prefetch_related(
                'order_items__product',
                'order_items__product__additional_images',
                'shippingaddress_set',
            )
            .order_by('-created_at')
        )
        status_slug = request.query_params.get('status')
        if status_slug:
            qs = qs.filter(pipeline_status__slug=status_slug)

        paginator = Paginator(qs, 20)
        page = paginator.get_page(request.query_params.get('page', 1))
        return Response({
            'success': True,
            'count': paginator.count,
            'num_pages': paginator.num_pages,
            'results': MerchantOrderSerializer(page.object_list, many=True, context={'request': request}).data,
        })


class MerchantOrderDetailAPIView(APIView):
    """GET /merchant/orders/<order_id>/ — full order detail with access validation."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, order_id):
        from core.models import Order
        from django.shortcuts import get_object_or_404
        order = get_object_or_404(
            Order.objects.select_related('user', 'pipeline_status')
            .prefetch_related(
                'order_items__product',
                'order_items__product__additional_images',
                'shippingaddress_set',
            ),
            id=order_id,
        )
        supplier = order.get_supplier()
        if not supplier:
            return Response({'success': False, 'message': 'Order has no associated supplier.'}, status=status.HTTP_404_NOT_FOUND)
        _, err = _assert_merchant_access(request.user, supplier.id)
        if err:
            return err
        return Response({
            'success': True,
            'order': MerchantOrderSerializer(order, context={'request': request}).data,
        })


class MerchantProductsAPIView(APIView):
    """GET /merchant/products/?merchant_id=X — list all products for the merchant."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        from core.models import Product
        from .serializers import MerchantProductSerializer
        merchant_id = request.query_params.get('merchant_id')
        if not merchant_id:
            return Response({'success': False, 'message': 'merchant_id is required.'}, status=status.HTTP_400_BAD_REQUEST)
        
        supplier, err = _assert_merchant_access(request.user, merchant_id)
        if err:
            return err

        products = Product.objects.filter(supplier=supplier).prefetch_related('additional_images').order_by('-id')
        
        return Response({
            'success': True,
            'products': MerchantProductSerializer(products, many=True, context={'request': request}).data
        })
