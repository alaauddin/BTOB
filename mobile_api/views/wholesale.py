from rest_framework import viewsets, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.core.files.base import ContentFile
from decimal import Decimal
import logging

from core.db.wholesale import WholesaleProduct, WholesaleSupplier
from core.db.product import Product, ProductImage
from ..serializers.wholesale import WholesaleProductSerializer, WholesaleSupplierSerializer
from .helpers import _assert_merchant_access

logger = logging.getLogger('mobile_api.views.wholesale')

class WholesaleSupplierViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for viewing wholesale suppliers.
    """
    queryset = WholesaleSupplier.objects.filter(is_active=True).order_by('name')
    serializer_class = WholesaleSupplierSerializer
    permission_classes = [permissions.IsAuthenticated]

    def list(self, request, *args, **kwargs):
        # We might want to restrict this list to only those suppliers that actually have active products
        # But for now, let's keep it simple.
        return super().list(request, *args, **kwargs)

class WholesaleProductViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for viewing wholesale products.
    """
    queryset = WholesaleProduct.objects.filter(is_active=True).order_by('-created_at')
    serializer_class = WholesaleProductSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset().select_related('wholesaler', 'category')
        # Only show products from active wholesalers
        qs = qs.filter(wholesaler__is_active=True)
        
        wholesaler_id = self.request.query_params.get('wholesaler_id')
        if wholesaler_id:
            qs = qs.filter(wholesaler_id=wholesaler_id)
        
        q = self.request.query_params.get('q')
        if q:
            from django.db.models import Q
            qs = qs.filter(Q(name__icontains=q) | Q(description__icontains=q))
            
        return qs

    def get_serializer_context(self):
        context = super().get_serializer_context()
        merchant_id = self.request.query_params.get('merchant_id')
        if merchant_id:
            supplier, _ = _assert_merchant_access(self.request.user, merchant_id)
            if supplier:
                context['active_supplier'] = supplier
        return context

    def list(self, request, *args, **kwargs):
        print(f"DEBUG: WholesaleProductViewSet.list called with merchant_id={request.query_params.get('merchant_id')}")
        merchant_id = request.query_params.get('merchant_id')
        if not merchant_id:
            return Response({'error': 'merchant_id is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        supplier, error = _assert_merchant_access(request.user, merchant_id)
        if error:
            return error
            
        if not supplier.can_buy_wholesale:
            return Response({'error': 'You do not have permission to access the wholesale market.'}, status=status.HTTP_403_FORBIDDEN)
            
        return super().list(request, *args, **kwargs)

class InheritWholesaleProductAPIView(APIView):
    """
    API View to inherit/source a wholesale product into a merchant's store.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        merchant_id = request.data.get('merchant_id')
        if not merchant_id:
            return Response({'error': 'merchant_id is required'}, status=status.HTTP_400_BAD_REQUEST)
            
        supplier, error = _assert_merchant_access(request.user, merchant_id)
        if error:
            return error
            
        if not supplier.can_buy_wholesale:
            return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
            
        wp = get_object_or_404(WholesaleProduct, id=pk, is_active=True)
        
        # Check if already inherited
        if Product.objects.filter(supplier=supplier, wholesale_origin=wp).exists():
            return Response({'error': 'Product already inherited'}, status=status.HTTP_400_BAD_REQUEST)
            
        custom_price = request.data.get('custom_price')
        if custom_price:
            try:
                final_price = Decimal(str(custom_price))
            except (ValueError, TypeError):
                final_price = wp.sale_price
        else:
            final_price = wp.sale_price
            
        try:
            # Create new product
            new_product = Product.objects.create(
                supplier=supplier,
                category=wp.category,
                name=wp.name,
                description=wp.description,
                price=final_price,
                purchase_cost=wp.purchase_price,
                wholesale_origin=wp,
                stock=10,
                is_active=True,
                is_new=True
            )
            
            # Copy media
            if wp.image:
                new_product.image.save(wp.image.name, ContentFile(wp.image.read()), save=True)
            
            if wp.video:
                new_product.video.save(wp.video.name, ContentFile(wp.video.read()), save=True)
                
            for ai in wp.additional_images.all():
                new_img = ProductImage(product=new_product)
                new_img.image.save(ai.image.name, ContentFile(ai.image.read()), save=True)
                
            return Response({
                'success': True,
                'message': f'تم استيراد المنتج "{wp.name}" بنجاح!',
                'product_id': new_product.id
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            logger.error(f"Error inheriting product {pk}: {str(e)}")
            return Response({'error': f'An error occurred: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
