from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, viewsets, permissions
from django.utils import timezone
from django.db.models import Q, Max, Count, Exists, Subquery, OuterRef
from django.shortcuts import get_object_or_404

from core.models import (
    Supplier, Product, SupplierCategory, SupplierAdPlatfrom, 
    PlatformOfferAd, SupplierAds, ProductOffer, Category, WishList
)
from ..serializers import (
    SupplierSerializer, ProductSerializer, SupplierCategorySerializer,
    SupplierAdSerializer, PlatformOfferAdSerializer, CategorySerializer
)

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
        
        categories = SupplierCategory.objects.all()
        
        # Supplier Ads (Full Width Top)
        supplier_ads = SupplierAdPlatfrom.objects.filter(
            is_active=True,
            approved=True,
            start_datetime__lte=timezone.now(),
            end_datetime__gte=timezone.now()
        ).select_related('supplier')
        
        # Platform Offer Ads (Horizontal Scroll)
        platform_ads = PlatformOfferAd.objects.filter(
            start_date__lte=today,
            end_date__gte=today,
            is_approved=True,
            product__supplier__is_active=True
        ).order_by('order').select_related('product', 'product__supplier')
        
        # Producing Family Suppliers
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
        
        # All Suppliers (Same Logic as SupplierViewSet)
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
        # Support both numeric ID and alphanumeric slug (store_id)
        if store_id.isdigit():
            supplier = get_object_or_404(Supplier, id=store_id, is_active=True)
        else:
            supplier = get_object_or_404(Supplier, store_id=store_id, is_active=True)
        today = timezone.now().date()
        
        # Supplier Ads
        supplier_ads = SupplierAds.objects.filter(supplier=supplier, is_active=True)
        
        # Product grouping logic
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

class CategoryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer

class SupplierCategoryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = SupplierCategory.objects.all()
    serializer_class = SupplierCategorySerializer
    permission_classes = [permissions.AllowAny]

class ToggleWishlistAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, product_id):
        product = get_object_or_404(Product, id=product_id)
        wishlist_item, created = WishList.objects.get_or_create(
            user=request.user, 
            product=product
        )
        
        if created:
            return Response({
                'success': True,
                'action': 'added',
                'is_wishlisted': True,
                'message': 'تم إضافة المنتج للمفضلة'
            })
        else:
            wishlist_item.delete()
            return Response({
                'success': True,
                'action': 'removed',
                'is_wishlisted': False,
                'message': 'تم إزالة المنتج من المفضلة'
            })

class WishlistStatusAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request, product_id):
        product = get_object_or_404(Product, id=product_id)
        is_wishlisted = WishList.objects.filter(
            user=request.user, 
            product=product
        ).exists()
        
        return Response({
            'success': True,
            'is_wishlisted': is_wishlisted
        })
