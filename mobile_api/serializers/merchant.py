from rest_framework import serializers
from django.conf import settings
from core.models import Supplier, OrderItem, Order, Product, ProductCategory, ProductOffer, ShippingAddress
from .base import CurrencySerializer
from .product import ProductAttributeSerializer

class MerchantMiniSerializer(serializers.ModelSerializer):
    """Compact serializer used in the merchant switcher list."""
    profile_picture = serializers.SerializerMethodField()
    panal_picture   = serializers.SerializerMethodField()
    currency_symbol = serializers.CharField(source='currency.symbol', read_only=True, default='د.ك')

    class Meta:
        model = Supplier
        fields = ['id', 'name', 'store_id', 'profile_picture', 'panal_picture', 'primary_color', 'latitude', 'longitude', 'can_buy_wholesale', 'currency_symbol', 'plan_name', 'plan_status', 'navbar_text_color']

    def _abs(self, obj, field_name):
        f = getattr(obj, field_name, None)
        if not f:
            return None
        request = self.context.get('request')
        url = f.url if hasattr(f, 'url') else str(f)
        return request.build_absolute_uri(url) if request else url

    def get_profile_picture(self, obj):
        return self._abs(obj, 'profile_picture')

    def get_panal_picture(self, obj):
        return self._abs(obj, 'panal_picture')

class MerchantProfileSerializer(serializers.ModelSerializer):
    """Full profile configuration serializer for merchant settings."""
    profile_picture_url = serializers.SerializerMethodField(read_only=True)
    cover_picture_url = serializers.SerializerMethodField(read_only=True)
    store_link = serializers.SerializerMethodField(read_only=True)
    currency_id = serializers.PrimaryKeyRelatedField(
        queryset=Supplier.objects.none(), # Placeholder, populated in __init__
        source='currency', required=False, allow_null=True
    )

    class Meta:
        model = Supplier
        fields = [
            'id', 'store_id', 'profile_picture', 'panal_picture',
            'name', 'city', 'address', 'country', 'phone', 'secondary_phone',
            'subdomain', 'latitude', 'longitude', 'profile_picture_url', 
            'cover_picture_url', 'store_link', 'currency_id',
            'show_order_amounts', 'show_platform_ads', 'show_system_logo',
            'primary_color', 'secondary_color', 'navbar_color', 'footer_color',
            'footer_text_color', 'accent_color', 'navbar_text_color',
            'return_policy', 'footer_description',
            'facebook_url', 'instagram_url', 'twitter_url', 'tiktok_url',
            'can_buy_wholesale', 'plan_name', 'plan_status'
        ]
        read_only_fields = ['id', 'store_id', 'profile_picture', 'panal_picture']

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        from core.models import Currency
        self.fields['currency_id'].queryset = Currency.objects.all()

    def _abs(self, obj, field_name):
        f = getattr(obj, field_name, None)
        if not f: return None
        request = self.context.get('request')
        url = f.url if hasattr(f, 'url') else str(f)
        return request.build_absolute_uri(url) if request else url

    def get_profile_picture_url(self, obj):
        return self._abs(obj, 'profile_picture')

    def get_cover_picture_url(self, obj):
        return self._abs(obj, 'panal_picture')
        
    def get_store_link(self, obj):
        if obj.subdomain:
            domain = getattr(settings, 'PLATFORM_DOMAIN', 'aratatt.com')
            return f"https://{obj.subdomain}.{domain}"
        return f"https://rawaage.com/store/{obj.store_id or obj.id}"

class MerchantOrderItemSerializer(serializers.ModelSerializer):
    product_name   = serializers.CharField(source='product.name', read_only=True)
    product_image  = serializers.SerializerMethodField()
    product_images = serializers.SerializerMethodField()
    unit_price     = serializers.SerializerMethodField()
    selected_options_details = serializers.SerializerMethodField()

    class Meta:
        model = OrderItem
        fields = [
            'id', 'product_name', 'product_image', 'product_images', 
            'quantity', 'unit_price', 'price_modifier_total', 'selected_options_details'
        ]

    def get_unit_price(self, obj):
        return obj.get_unit_price_with_discount()

    def get_selected_options_details(self, obj):
        from .product import ProductAttributeOptionSerializer
        return ProductAttributeOptionSerializer(obj.selected_options.all(), many=True).data

    def _build_url(self, request, path):
        if not path: return None
        url = path.url if hasattr(path, 'url') else str(path)
        return request.build_absolute_uri(url) if request else url

    def get_product_image(self, obj):
        return self._build_url(self.context.get('request'), obj.product.image)

    def get_product_images(self, obj):
        request = self.context.get('request')
        extra = []
        if hasattr(obj.product, 'additional_images'):
            for img in obj.product.additional_images.all():
                url = self._build_url(request, img.image)
                if url: extra.append(url)
        return extra

class MerchantOrderSerializer(serializers.ModelSerializer):
    items         = MerchantOrderItemSerializer(source='order_items', many=True, read_only=True)
    customer_name = serializers.SerializerMethodField()
    status_name   = serializers.CharField(source='pipeline_status.name', read_only=True, default='غير محدد')
    status_slug   = serializers.CharField(source='pipeline_status.slug', read_only=True, default='')
    shipping      = serializers.SerializerMethodField()
    merchant      = serializers.SerializerMethodField()
    workflow_steps = serializers.SerializerMethodField()
    current_priority = serializers.SerializerMethodField()
    current_requires_driver = serializers.SerializerMethodField()
    assigned_driver = serializers.SerializerMethodField()
    available_drivers = serializers.SerializerMethodField()
    enable_delivery_drivers = serializers.SerializerMethodField()
    payment_transaction = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = [
            'id', 'customer_name', 'total_amount', 'created_at', 'updated_at',
            'status_name', 'status_slug', 'merchant', 'items', 'shipping',
            'workflow_steps', 'current_priority', 'current_requires_driver',
            'assigned_driver', 'available_drivers', 'enable_delivery_drivers',
            'payment_transaction',
        ]

    def get_customer_name(self, obj):
        return obj.user.get_full_name() or obj.user.username

    def get_merchant(self, obj):
        try:
            supplier = obj.order_items.first().product.supplier
        except AttributeError:
            return None
        return MerchantMiniSerializer(supplier, context=self.context).data

    def get_workflow_steps(self, obj):
        try:
            supplier = obj.order_items.first().product.supplier
            if not supplier.workflow: return []
            return [
                {
                    'name': step.status.name,
                    'slug': step.status.slug,
                    'priority': step.priority,
                    'requires_driver_assignment': step.requires_driver_assignment,
                }
                for step in supplier.workflow.steps.all().select_related('status').order_by('priority')
            ]
        except AttributeError:
            return []

    def get_current_priority(self, obj):
        try:
            supplier = obj.order_items.first().product.supplier
            if not supplier.workflow or not obj.pipeline_status: return 0
            step = supplier.workflow.steps.filter(status=obj.pipeline_status).first()
            return step.priority if step else 0
        except AttributeError:
            return 0

    def get_current_requires_driver(self, obj):
        try:
            supplier = obj.order_items.first().product.supplier
            if not supplier.workflow or not obj.pipeline_status: return False
            step = supplier.workflow.steps.filter(status=obj.pipeline_status).first()
            return step.requires_driver_assignment if step else False
        except AttributeError:
            return False

    def get_assigned_driver(self, obj):
        if not obj.delivery_driver: return None
        return {
            'id': obj.delivery_driver.id,
            'name': obj.delivery_driver.user.get_full_name() or obj.delivery_driver.user.username,
            'phone': obj.delivery_driver.phone,
        }

    def get_available_drivers(self, obj):
        try:
            supplier = obj.order_items.first().product.supplier
            if not supplier.enable_delivery_drivers: return []
            from core.models import DeliveryDriver
            return [
                {
                    'id': drv.id,
                    'name': drv.user.get_full_name() or drv.user.username,
                    'phone': drv.phone,
                }
                for drv in DeliveryDriver.objects.filter(supplier=supplier, is_active=True).select_related('user')
            ]
        except AttributeError:
            return []

    def get_enable_delivery_drivers(self, obj):
        try:
            return obj.order_items.first().product.supplier.enable_delivery_drivers
        except AttributeError:
            return False

    def get_shipping(self, obj):
        addr = obj.shippingaddress_set.first()
        if not addr: return None
        return {
            'phone': addr.phone,
            'address_line1': addr.address_line1,
            'address_line2': addr.address_line2,
            'city': addr.city,
            'country': addr.country,
            'latitude': addr.latitude,
            'longitude': addr.longitude,
        }

    def get_payment_transaction(self, obj):
        from .payment import PaymentTransactionSerializer
        tx = getattr(obj, 'payment_transaction', None)
        if not tx:
            # Fallback for OneToOneField if not prefetched or accessed via related name
            from core.models import PaymentTransaction
            tx = PaymentTransaction.objects.filter(order=obj).first()
        
        if tx:
            return PaymentTransactionSerializer(tx, context=self.context).data
        return None

class MerchantProductSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField(read_only=True)
    video_url = serializers.SerializerMethodField(read_only=True)
    extra_images = serializers.SerializerMethodField(read_only=True)
    price_after_discount = serializers.SerializerMethodField(read_only=True)
    has_discount = serializers.SerializerMethodField(read_only=True)
    attributes = ProductAttributeSerializer(many=True, read_only=True)
    
    category_id = serializers.PrimaryKeyRelatedField(
        queryset=ProductCategory.objects.all(), source='category', required=False
    )

    class Meta:
        model = Product
        fields = [
            'id', 'name', 'description', 'price', 'image', 'video', 
            'is_new', 'is_active', 'stock', 'category_id',
            'image_url', 'video_url', 'extra_images',
            'price_after_discount', 'has_discount', 'attributes'
        ]
        extra_kwargs = {
            'image': {'write_only': True, 'required': False},
            'video': {'write_only': True, 'required': False},
        }

    def _handle_variations(self, product, variations_data):
        if variations_data is None: return
        import json
        if isinstance(variations_data, str):
            try:
                variations = json.loads(variations_data)
            except json.JSONDecodeError:
                return
        else:
            variations = variations_data

        # Clear existing variations if updating
        product.attributes.all().delete()

        for attr_data in variations:
            from core.models import ProductAttribute, ProductAttributeOption
            attr = ProductAttribute.objects.create(
                product=product,
                name=attr_data.get('name', '')
            )
            for opt_data in attr_data.get('options', []):
                ProductAttributeOption.objects.create(
                    attribute=attr,
                    value=opt_data.get('value', ''),
                    price_modifier=opt_data.get('price_modifier', 0)
                )

    def _handle_additional_images(self, product, additional_images):
        if not additional_images: return
        from core.models import ProductImage
        for img in additional_images:
            ProductImage.objects.create(product=product, image=img)

    def create(self, validated_data):
        request = self.context.get('request')
        variations_data = request.data.get('variations')
        additional_images = request.FILES.getlist('additional_images')

        product = super().create(validated_data)
        
        self._handle_variations(product, variations_data)
        self._handle_additional_images(product, additional_images)
        
        return product

    def update(self, instance, validated_data):
        request = self.context.get('request')
        variations_data = request.data.get('variations')
        additional_images = request.FILES.getlist('additional_images')

        product = super().update(instance, validated_data)
        
        if variations_data is not None:
            self._handle_variations(product, variations_data)
        
        if additional_images:
            self._handle_additional_images(product, additional_images)
        
        return product

    def _build_url(self, request, field):
        if not field: return None
        if request: return request.build_absolute_uri(field.url)
        return field.url

    def get_image_url(self, obj):
        return self._build_url(self.context.get('request'), obj.image)

    def get_video_url(self, obj):
        return self._build_url(self.context.get('request'), obj.video)

    def get_extra_images(self, obj):
        request = self.context.get('request')
        urls = []
        if hasattr(obj, 'additional_images'):
            for img in obj.additional_images.all():
                url = self._build_url(request, img.image)
                if url: urls.append(url)
        return urls

    def get_price_after_discount(self, obj):
        return obj.get_price_with_offer()

    def get_has_discount(self, obj):
        return obj.has_discount()

class MerchantOfferSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_price = serializers.DecimalField(source='product.price', max_digits=10, decimal_places=2, read_only=True)
    discount_percentage = serializers.SerializerMethodField(read_only=True)
    
    class Meta:
        model = ProductOffer
        fields = [
            'id', 'product', 'product_name', 'product_price', 
            'is_active', 'discount_precentage', 'discount_percentage',
            'from_date', 'to_date', 'create_at'
        ]
        read_only_fields = ['id', 'create_at', 'created_by']

    def get_discount_percentage(self, obj):
        return obj.get_discount_percentage_offer()

class MerchantDriverSerializer(serializers.ModelSerializer):
    name = serializers.CharField(source='user.get_full_name', read_only=True)
    username = serializers.CharField(source='user.username', read_only=True)

    class Meta:
        from core.models import DeliveryDriver
        model = DeliveryDriver
        fields = ['id', 'name', 'phone', 'username', 'is_active']
