from rest_framework import serializers
from core.models import Cart, CartItem, Product, ProductAttributeOption

class CartItemSerializer(serializers.ModelSerializer):
    product = serializers.SerializerMethodField()
    product_id = serializers.PrimaryKeyRelatedField(
        queryset=Product.objects.all(), source='product', write_only=True
    )

    selected_options = serializers.PrimaryKeyRelatedField(
        queryset=ProductAttributeOption.objects.all(), 
        many=True, 
        required=False
    )
    
    selected_options_details = serializers.SerializerMethodField()
    subtotal_with_discount = serializers.SerializerMethodField()

    class Meta:
        model = CartItem
        fields = '__all__'
        
    def get_selected_options_details(self, obj):
        from .product import ProductAttributeOptionSerializer
        return ProductAttributeOptionSerializer(obj.selected_options.all(), many=True).data
        
    def get_subtotal_with_discount(self, obj):
        return obj.get_subtotal_with_discount()

    def get_product(self, obj):
        from .product import ProductSerializer
        return ProductSerializer(obj.product, context=self.context).data

class CartSerializer(serializers.ModelSerializer):
    items = CartItemSerializer(source='cart_items', many=True, read_only=True)

    class Meta:
        model = Cart
        fields = '__all__'
