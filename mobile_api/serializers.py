from rest_framework import serializers
from django.contrib.auth.models import User

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'email']

class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField()

class SignupSerializer(serializers.Serializer):
    username = serializers.CharField()
    first_name = serializers.CharField(required=False, allow_blank=True)
    password = serializers.CharField(write_only=True)

class UnifiedAuthSerializer(serializers.Serializer):
    phone = serializers.CharField()

class PasswordResetRequestSerializer(serializers.Serializer):
    username = serializers.CharField()

# --- Core Serializers ---
from core.models import (
    Supplier, SupplierCategory, Category, ProductCategory, Product, 
    ProductImage, Cart, CartItem, Order, OrderItem,
    SupplierAdPlatfrom, PlatformOfferAd, Currency
)

class SupplierAdSerializer(serializers.ModelSerializer):
    supplier = serializers.PrimaryKeyRelatedField(read_only=True)
    class Meta:
        model = SupplierAdPlatfrom
        fields = '__all__'


class SupplierCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = SupplierCategory
        fields = ['id', 'name', 'producing_family']

class CurrencySerializer(serializers.ModelSerializer):
    class Meta:
        model = Currency
        fields = ['id', 'name', 'code', 'symbol']

class SupplierSerializer(serializers.ModelSerializer):
    max_offer_discount = serializers.DecimalField(max_digits=5, decimal_places=2, read_only=True)
    offers_count = serializers.IntegerField(read_only=True)
    category = SupplierCategorySerializer(many=True, read_only=True)
    currency = CurrencySerializer(read_only=True)
    
    class Meta:
        model = Supplier
        fields = '__all__'

class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = '__all__'

class ProductCategorySerializer(serializers.ModelSerializer):
    category = CategorySerializer(read_only=True)
    class Meta:
        model = ProductCategory
        fields = '__all__'

class ProductImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductImage
        fields = ['id', 'image']

class ProductSerializer(serializers.ModelSerializer):
    supplier = SupplierSerializer(read_only=True)
    category = ProductCategorySerializer(read_only=True)
    images = ProductImageSerializer(source='additional_images', many=True, read_only=True)
    video = serializers.SerializerMethodField()

    price_after_discount = serializers.SerializerMethodField()
    has_discount = serializers.SerializerMethodField()
    discount_percentage = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = '__all__'

    def get_video(self, obj):
        """Return an absolute URL for the product video, or None if not present."""
        if not obj.video:
            return None
        request = self.context.get('request')
        if request:
            return request.build_absolute_uri(obj.video.url)
        return obj.video.url

    def get_price_after_discount(self, obj):
        return obj.get_price_with_offer()

    def get_has_discount(self, obj):
        return obj.has_discount()

    def get_discount_percentage(self, obj):
        return obj.get_discount_precentage() if obj.has_discount() else 0

class PlatformOfferAdSerializer(serializers.ModelSerializer):
    product = ProductSerializer(read_only=True)
    class Meta:
        model = PlatformOfferAd
        fields = '__all__'

class CartItemSerializer(serializers.ModelSerializer):
    product = ProductSerializer(read_only=True)
    product_id = serializers.PrimaryKeyRelatedField(
        queryset=Product.objects.all(), source='product', write_only=True
    )

    class Meta:
        model = CartItem
        fields = '__all__'

class CartSerializer(serializers.ModelSerializer):
    items = CartItemSerializer(source='cart_items', many=True, read_only=True)

    class Meta:
        model = Cart
        fields = '__all__'

class OrderItemSerializer(serializers.ModelSerializer):
    product = ProductSerializer(read_only=True)
    class Meta:
        model = OrderItem
        fields = '__all__'

class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    supplier = SupplierSerializer(read_only=True)
    class Meta:
        model = Order
        fields = '__all__'


# ── Merchant Management Serializers (lightweight) ─────────────────────────────

class MerchantMiniSerializer(serializers.ModelSerializer):
    """Compact serializer used in the merchant switcher list."""

    profile_picture = serializers.SerializerMethodField()
    panal_picture   = serializers.SerializerMethodField()

    class Meta:
        model = Supplier
        fields = ['id', 'name', 'store_id', 'profile_picture', 'panal_picture', 'primary_color']

    def _abs(self, obj, field_name):
        """Return an absolute URL for an image field, or None."""
        f = getattr(obj, field_name, None)
        if not f:
            return None
        request = self.context.get('request')
        url = f.url if hasattr(f, 'url') else str(f)
        return request.build_absolute_uri(url) if request else url

    def get_profile_picture(self, obj):
        """Return absolute URL for the merchant logo."""
        return self._abs(obj, 'profile_picture')

    def get_panal_picture(self, obj):
        """Return absolute URL for the merchant cover/banner."""
        return self._abs(obj, 'panal_picture')


class ShippingAddressSerializer(serializers.ModelSerializer):
    """Shipping address details for merchant order view."""

    class Meta:
        from core.models import ShippingAddress
        model = ShippingAddress
        fields = '__all__'


class MerchantOrderItemSerializer(serializers.ModelSerializer):
    """Order item with product info (name, images, price) for the merchant view."""

    product_name   = serializers.CharField(source='product.name', read_only=True)
    product_image  = serializers.SerializerMethodField()
    product_images = serializers.SerializerMethodField()
    unit_price     = serializers.DecimalField(
        source='product.price', max_digits=10, decimal_places=2, read_only=True
    )

    class Meta:
        model = OrderItem
        fields = ['id', 'product_name', 'product_image', 'product_images', 'quantity', 'unit_price']

    def _build_url(self, request, path):
        """Build an absolute URL for an image path."""
        if not path:
            return None
        url = path.url if hasattr(path, 'url') else str(path)
        return request.build_absolute_uri(url) if request else url

    def get_product_image(self, obj):
        """Return absolute URL for the product's primary image."""
        request = self.context.get('request')
        return self._build_url(request, obj.product.image)

    def get_product_images(self, obj):
        """
        Return a list of absolute URLs for all extra product images
        (from the ProductImage related manager).
        """
        request = self.context.get('request')
        extra = []
        if hasattr(obj.product, 'additional_images'):
            for img in obj.product.additional_images.all():
                url = self._build_url(request, img.image)
                if url:
                    extra.append(url)
        return extra


class MerchantOrderSerializer(serializers.ModelSerializer):
    """Full order detail as seen by the merchant, including merchant branding."""

    items         = MerchantOrderItemSerializer(source='order_items', many=True, read_only=True)
    customer_name = serializers.SerializerMethodField()
    status_name   = serializers.CharField(source='pipeline_status.name', read_only=True, default='غير محدد')
    status_slug   = serializers.CharField(source='pipeline_status.slug', read_only=True, default='')
    shipping      = serializers.SerializerMethodField()
    merchant      = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = [
            'id', 'customer_name', 'total_amount', 'created_at', 'updated_at',
            'status_name', 'status_slug', 'merchant', 'items', 'shipping',
        ]

    def get_customer_name(self, obj):
        """Return the customer's full name or username."""
        return obj.user.get_full_name() or obj.user.username

    def get_merchant(self, obj):
        """
        Return lightweight merchant info (logo + cover) for the order.
        Finds the supplier via the first order item's product.
        """
        try:
            supplier = obj.order_items.first().product.supplier
        except AttributeError:
            return None
        return MerchantMiniSerializer(supplier, context=self.context).data

    def get_shipping(self, obj):
        """Return the first shipping address for the order."""
        addr = obj.shippingaddress_set.first()
        if not addr:
            return None
        return {
            'phone': addr.phone,
            'address_line1': addr.address_line1,
            'address_line2': addr.address_line2,
            'city': addr.city,
            'country': addr.country,
        }

class MerchantProductSerializer(serializers.ModelSerializer):
    """
    Serializer for products tailored for the merchant view.
    Includes absolute URLs for the main image, video, and all extra images.
    """
    image = serializers.SerializerMethodField()
    video = serializers.SerializerMethodField()
    extra_images = serializers.SerializerMethodField()
    price_after_discount = serializers.SerializerMethodField()
    has_discount = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            'id', 'name', 'description', 'price', 'image', 'video', 
            'is_new', 'is_active', 'stock', 'extra_images',
            'price_after_discount', 'has_discount'
        ]

    def _build_url(self, request, image_field):
        if not image_field:
            return None
        if request:
            return request.build_absolute_uri(image_field.url)
        return image_field.url

    def get_image(self, obj):
        return self._build_url(self.context.get('request'), obj.image)

    def get_video(self, obj):
        return self._build_url(self.context.get('request'), obj.video)

    def get_extra_images(self, obj):
        request = self.context.get('request')
        urls = []
        if hasattr(obj, 'additional_images'):
            for img in obj.additional_images.all():
                url = self._build_url(request, img.image)
                if url:
                    urls.append(url)
        return urls

    def get_price_after_discount(self, obj):
        return obj.get_price_with_offer()

    def get_has_discount(self, obj):
        return obj.has_discount()
