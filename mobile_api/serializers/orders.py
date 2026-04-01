from rest_framework import serializers
from core.models import Order, OrderItem

class OrderItemSerializer(serializers.ModelSerializer):
    product = serializers.SerializerMethodField()
    class Meta:
        model = OrderItem
        fields = '__all__'
        
    def get_product(self, obj):
        from .product import ProductSerializer
        return ProductSerializer(obj.product, context=self.context).data

class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    supplier = serializers.SerializerMethodField()
    
    class Meta:
        model = Order
        fields = '__all__'
        
    def get_supplier(self, obj):
        from .buyer import SupplierSerializer
        return SupplierSerializer(obj.supplier, context=self.context).data
