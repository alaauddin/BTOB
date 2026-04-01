from rest_framework import serializers
from core.models import ProductCategory, Product, ProductImage, ProductAttribute, ProductAttributeOption
from .base import CategorySerializer

class ProductCategorySerializer(serializers.ModelSerializer):
    category = CategorySerializer(read_only=True)
    class Meta:
        model = ProductCategory
        fields = '__all__'

class MerchantProductCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductCategory
        fields = ['id', 'name']

class ProductImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductImage
        fields = ['id', 'image']

class ProductAttributeOptionSerializer(serializers.ModelSerializer):
    attribute_name = serializers.CharField(source='attribute.name', read_only=True)
    attribute_id = serializers.IntegerField(source='attribute.id', read_only=True)
    class Meta:
        model = ProductAttributeOption
        fields = ['id', 'value', 'price_modifier', 'attribute_name', 'attribute_id']

class ProductAttributeSerializer(serializers.ModelSerializer):
    options = ProductAttributeOptionSerializer(many=True, read_only=True)
    class Meta:
        model = ProductAttribute
        fields = ['id', 'name', 'options']

class ProductSerializer(serializers.ModelSerializer):
    # To avoid circular dependency with SupplierSerializer (if it were to need ProductSerializer),
    # we can either import here or use a StringRelatedField/MethodField.
    # For now, we'll import SupplierSerializer at runtime if needed, 
    # but since it's a separate file, we can try importing it at the top level 
    # of the module that doesn't cause a loop.
    
    supplier = serializers.SerializerMethodField()
    category = ProductCategorySerializer(read_only=True)
    images = ProductImageSerializer(source='additional_images', many=True, read_only=True)
    attributes = ProductAttributeSerializer(many=True, read_only=True)
    video = serializers.SerializerMethodField()

    price_after_discount = serializers.SerializerMethodField()
    has_discount = serializers.SerializerMethodField()
    discount_percentage = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = '__all__'

    def get_supplier(self, obj):
        from .buyer import SupplierSerializer
        return SupplierSerializer(obj.supplier, context=self.context).data

    def get_video(self, obj):
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
