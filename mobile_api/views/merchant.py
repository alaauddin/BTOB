from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from django.utils import timezone
from django.db.models import Sum, Avg, Q, Max, Count
from django.core.paginator import Paginator
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser

from core.models import Order, Product, Supplier, SystemSettings, ProductOffer, ProductCategory
from ..serializers import (
    MerchantMiniSerializer, MerchantOrderSerializer, 
    MerchantProductSerializer, MerchantOfferSerializer,
    MerchantProductCategorySerializer, SupplierSerializer,
    MerchantDriverSerializer
)
from django.shortcuts import get_object_or_404
from .helpers import (
    _assert_merchant_access, _get_manageable_merchants, _merchant_list_data
)

def _build_dashboard_stats(supplier):
    """Compute KPI dashboard stats for a supplier. Returns a dict."""
    today = timezone.now().date()
    supplier_orders = Order.objects.filter(
        order_items__product__supplier=supplier
    ).distinct()
    
    revenue_this_month = (
        supplier_orders
        .filter(created_at__year=today.year, created_at__month=today.month, pipeline_status__slug='confirmed')
        .aggregate(total=Sum('total_amount'))['total'] or 0
    )
    
    total_revenue = supplier_orders.filter(pipeline_status__slug='confirmed').aggregate(
        total=Sum('total_amount')
    )['total'] or 0

    avg_rating = Product.objects.filter(supplier=supplier).aggregate(avg=Avg('review__rating'))['avg'] or 0

    return {
        'orders_today': supplier_orders.filter(created_at__date=today).count(),
        'orders_this_month': supplier_orders.filter(
            created_at__year=today.year, created_at__month=today.month
        ).count(),
        'total_orders': supplier_orders.count(),
        'revenue_this_month': str(revenue_this_month),
        'total_revenue': str(total_revenue),
        'pending_orders': supplier_orders.filter(pipeline_status__slug='pending').count(),
        'total_products': Product.objects.filter(supplier=supplier).count(),
        'low_stock_count': Product.objects.filter(
            supplier=supplier, is_active=True, stock__lt=5
        ).count(),
        'average_rating': round(avg_rating, 1),
    }

def _build_onboarding_stats(supplier):
    """Compute onboarding progress for the dashboard."""
    try:
        system_settings = SystemSettings.objects.first()
        show_agreement = system_settings.show_merchant_agreement if system_settings else False
    except:
        show_agreement = False

    has_logo = bool(supplier.profile_picture)
    has_cover = bool(supplier.panal_picture)
    has_location = bool(supplier.latitude and supplier.longitude)
    has_currency = bool(supplier.currency)
    has_subdomain = bool(supplier.subdomain)
    has_products = Product.objects.filter(supplier=supplier).exists()
    agreed_to_terms = supplier.agreed_to_terms

    percent = 30 if show_agreement else 30
    if has_logo: percent += 10
    if has_cover: percent += 10
    if has_location: percent += 10
    if has_currency: percent += 10
    if has_subdomain: percent += 10
    if has_products: percent += 20
    
    # Cap at 100
    percent = min(percent, 100)

    return {
        'has_logo': has_logo,
        'has_cover': has_cover,
        'has_location': has_location,
        'has_currency': has_currency,
        'has_subdomain': has_subdomain,
        'has_products': has_products,
        'agreed_to_terms': agreed_to_terms,
        'progress_percentage': percent
    }

def _top_products_qs(supplier, limit=5):
    """Return a QuerySet of the top selling products."""
    return Product.objects.filter(supplier=supplier).annotate(
        total_sold=Sum('orderitem__quantity')
    ).filter(total_sold__gt=0).order_by('-total_sold')[:limit]

def _recent_orders_qs(supplier, limit=10):
    """Return a QuerySet of the most recent orders for a supplier."""
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
            'onboarding': _build_onboarding_stats(supplier),
            'recent_orders': MerchantOrderSerializer(
                _recent_orders_qs(supplier), many=True, context={'request': request}
            ).data,
            'top_products': MerchantProductSerializer(
                _top_products_qs(supplier), many=True, context={'request': request}
            ).data,
        })

class MerchantSwitchAPIView(APIView):
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
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        merchant_id = request.query_params.get('merchant_id')
        if not merchant_id:
            return Response({'success': False, 'message': 'merchant_id is required.'}, status=status.HTTP_400_BAD_REQUEST)
        supplier, err = _assert_merchant_access(request.user, merchant_id)
        if err:
            return err

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
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, order_id):
        merchant_id = request.query_params.get('merchant_id')
        if not merchant_id:
            return Response({'success': False, 'message': 'merchant_id is required.'}, status=status.HTTP_400_BAD_REQUEST)
        supplier, err = _assert_merchant_access(request.user, merchant_id)
        if err:
            return err

        order = (
            Order.objects
            .filter(order_items__product__supplier=supplier, id=order_id)
            .distinct()
            .select_related('user', 'pipeline_status')
            .prefetch_related(
                'order_items__product',
                'order_items__product__additional_images',
                'shippingaddress_set',
            )
            .first()
        )
        if not order:
            return Response({'success': False, 'message': 'Order not found.'}, status=status.HTTP_404_NOT_FOUND)

        return Response({
            'success': True,
            'order': MerchantOrderSerializer(order, context={'request': request}).data,
        })

    def patch(self, request, order_id):
        merchant_id = request.data.get('merchant_id')
        status_slug = request.data.get('status')
        driver_id = request.data.get('driver_id')

        if not merchant_id:
            return Response({'success': False, 'message': 'merchant_id is required.'}, status=status.HTTP_400_BAD_REQUEST)
        
        supplier, err = _assert_merchant_access(request.user, merchant_id)
        if err: return err

        order = Order.objects.filter(order_items__product__supplier=supplier, id=order_id).distinct().first()
        if not order:
            return Response({'success': False, 'message': 'Order not found.'}, status=status.HTTP_404_NOT_FOUND)

        # 1. Handle Driver Assignment
        if driver_id is not None:
            from core.models import DeliveryDriver
            if driver_id == '': # Unassign
                order.delivery_driver = None
                order.save()
            else:
                driver = DeliveryDriver.objects.filter(id=driver_id, supplier=supplier, is_active=True).first()
                if not driver:
                    return Response({'success': False, 'message': 'Invalid driver ID.'}, status=status.HTTP_400_BAD_REQUEST)
                order.delivery_driver = driver
                order.save()

        # 2. Handle Status Update
        if status_slug:
            from core.models import OrderStatus
            new_status = OrderStatus.objects.filter(slug=status_slug).first()
            if not new_status:
                return Response({'success': False, 'message': 'Invalid status slug.'}, status=status.HTTP_400_BAD_REQUEST)

            success, message = order.update_status(new_status, user=request.user)
            if not success:
                return Response({'success': False, 'message': message}, status=status.HTTP_400_BAD_REQUEST)

        return Response({
            'success': True,
            'message': 'Order updated successfully.',
            'order': MerchantOrderSerializer(order, context={'request': request}).data
        })

class MerchantProductsAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get(self, request):
        merchant_id = request.query_params.get('merchant_id')
        if not merchant_id:
            return Response({'success': False, 'message': 'merchant_id is required.'}, status=status.HTTP_400_BAD_REQUEST)
        
        supplier, err = _assert_merchant_access(request.user, merchant_id)
        if err: return err

        # Filters
        q = request.query_params.get('q')
        category_id = request.query_params.get('category_id')
        status_filter = request.query_params.get('status')

        products = Product.objects.filter(supplier=supplier)
        
        if q:
            products = products.filter(name__icontains=q)
        if category_id:
            products = products.filter(category_id=category_id)
        if status_filter == 'active':
            products = products.filter(is_active=True)
        elif status_filter == 'inactive':
            products = products.filter(is_active=False)

        products = products.order_by('-id')

        return Response({
            'success': True,
            'products': MerchantProductSerializer(products, many=True, context={'request': request}).data
        })

    def post(self, request):
        merchant_id = request.data.get('merchant_id')
        if not merchant_id:
            return Response({'success': False, 'message': 'merchant_id is required.'}, status=status.HTTP_400_BAD_REQUEST)
        
        supplier, err = _assert_merchant_access(request.user, merchant_id)
        if err: return err

        serializer = MerchantProductSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            serializer.save(supplier=supplier)
            return Response({'success': True, 'product': serializer.data}, status=status.HTTP_201_CREATED)
        return Response({'success': False, 'errors': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

    def patch(self, request):
        product_id = request.data.get('product_id')
        if not product_id:
            return Response({'success': False, 'message': 'product_id is required.'}, status=status.HTTP_400_BAD_REQUEST)
        
        product = get_object_or_404(Product, id=product_id)
        supplier, err = _assert_merchant_access(request.user, product.supplier_id)
        if err: return err

        serializer = MerchantProductSerializer(product, data=request.data, partial=True, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            return Response({'success': True, 'product': serializer.data})
        return Response({'success': False, 'errors': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request):
        product_id = request.query_params.get('product_id')
        if not product_id:
            return Response({'success': False, 'message': 'product_id is required.'}, status=status.HTTP_400_BAD_REQUEST)
        
        product = get_object_or_404(Product, id=product_id)
        supplier, err = _assert_merchant_access(request.user, product.supplier_id)
        if err: return err

        product.delete()
        return Response({'success': True, 'message': 'Product deleted successfully'})

class MerchantOffersAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        merchant_id = request.query_params.get('merchant_id')
        if not merchant_id: return Response({'success': False, 'message': 'merchant_id is required.'}, status=status.HTTP_400_BAD_REQUEST)
        supplier, err = _assert_merchant_access(request.user, merchant_id)
        if err: return err

        offers = ProductOffer.objects.filter(product__supplier=supplier).order_by('-id')
        return Response({
            'success': True,
            'offers': MerchantOfferSerializer(offers, many=True, context={'request': request}).data
        })

    def post(self, request):
        product_id = request.data.get('product')
        product = get_object_or_404(Product, id=product_id)
        supplier, err = _assert_merchant_access(request.user, product.supplier_id)
        if err: return err

        serializer = MerchantOfferSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            return Response({'success': True, 'offer': serializer.data}, status=status.HTTP_201_CREATED)
        return Response({'success': False, 'errors': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request):
        offer_id = request.query_params.get('offer_id')
        offer = get_object_or_404(ProductOffer, id=offer_id)
        supplier, err = _assert_merchant_access(request.user, offer.product.supplier_id)
        if err: return err

        offer.delete()
        return Response({'success': True, 'message': 'Offer deleted successfully'})

class MerchantProductCategoriesAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        categories = ProductCategory.objects.all().order_by('name')
        return Response({
            'success': True,
            'categories': MerchantProductCategorySerializer(categories, many=True).data
        })

class MerchantProfileAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        merchant_id = request.query_params.get('merchant_id')
        if not merchant_id:
            return Response({'success': False, 'message': 'merchant_id required'}, status=status.HTTP_400_BAD_REQUEST)
        supplier, err = _assert_merchant_access(request.user, merchant_id)
        if err: return err

        return Response({
            'success': True,
            'merchant': SupplierSerializer(supplier, context={'request': request}).data,
            'profile': SupplierSerializer(supplier, context={'request': request}).data
        })

    def patch(self, request):
        # We need the merchant_id either from query_params or data
        merchant_id = request.data.get('merchant_id') or request.query_params.get('merchant_id')
        if not merchant_id:
             return Response({'success': False, 'message': 'merchant_id required'}, status=status.HTTP_400_BAD_REQUEST)
        
        supplier, err = _assert_merchant_access(request.user, merchant_id)
        if err: return err

        # Create a mutable copy if it's a QueryDict
        data = request.data.copy() if hasattr(request.data, 'copy') else request.data
        
        serializer = SupplierSerializer(supplier, data=data, partial=True, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            return Response({
                'success': True, 
                'merchant': serializer.data,
                'profile': serializer.data
            })
        return Response({'success': False, 'errors': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

class MerchantBrandingAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        merchant_id = request.data.get('merchant_id')
        if not merchant_id: return Response({'success': False, 'message': 'merchant_id required'}, status=status.HTTP_400_BAD_REQUEST)
        supplier, err = _assert_merchant_access(request.user, merchant_id)
        if err: return err

        serializer = SupplierSerializer(supplier, data=request.data, partial=True, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            return Response({
                'success': True, 
                'merchant': serializer.data,
                'profile': serializer.data
            })
        return Response({'success': False, 'errors': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

class MerchantAgreeTermsAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        merchant_id = request.data.get('merchant_id')
        supplier, err = _assert_merchant_access(request.user, merchant_id)
        if err: return err

        supplier.agreed_to_terms = True
        supplier.save()
        return Response({'success': True, 'message': 'Terms agreed.'})

class MerchantDriversAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        merchant_id = request.query_params.get('merchant_id')
        if not merchant_id: return Response({'success': False, 'message': 'merchant_id required'}, status=status.HTTP_400_BAD_REQUEST)
        supplier, err = _assert_merchant_access(request.user, merchant_id)
        if err: return err

        from core.models import DeliveryDriver
        drivers = DeliveryDriver.objects.filter(supplier=supplier).order_by('-id')
        return Response({
            'success': True,
            'drivers': MerchantDriverSerializer(drivers, many=True, context={'request': request}).data
        })

    def post(self, request):
        merchant_id = request.data.get('merchant_id')
        if not merchant_id: return Response({'success': False, 'message': 'merchant_id required'}, status=status.HTTP_400_BAD_REQUEST)
        supplier, err = _assert_merchant_access(request.user, merchant_id)
        if err: return err

        first_name = request.data.get('first_name')
        last_name  = request.data.get('last_name', '')
        phone      = request.data.get('phone')
        username   = request.data.get('username')
        password   = request.data.get('password')

        if not all([first_name, phone, username, password]):
            return Response({'success': False, 'message': 'All fields are required.'}, status=status.HTTP_400_BAD_REQUEST)

        from django.contrib.auth.models import User
        from core.models import DeliveryDriver

        if User.objects.filter(username=username).exists():
            return Response({'success': False, 'message': f'Username "{username}" already exists.'}, status=status.HTTP_400_BAD_REQUEST)

        if DeliveryDriver.objects.filter(phone=phone, supplier=supplier).exists():
            return Response({'success': False, 'message': 'A driver with this phone already exists for this supplier.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.create_user(
                username=username,
                password=password,
                first_name=first_name,
                last_name=last_name
            )
            driver = DeliveryDriver.objects.create(
                user=user,
                supplier=supplier,
                phone=phone
            )
            
            # Send WhatsApp with credentials
            from core.utils.whatsapp_utils import send_whatsapp_message
            msg = f"مرحباً {first_name}، تم تسجيلك كسائق في {supplier.name}.\nبيانات الدخول:\nالمستخدم: {username}\nكلمة المرور: {password}"
            send_whatsapp_message(phone, msg)

            return Response({
                'success': True,
                'message': 'Driver created and credentials sent via WhatsApp.',
                'driver': MerchantDriverSerializer(driver, context={'request': request}).data
            })
        except Exception as e:
            return Response({'success': False, 'message': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
