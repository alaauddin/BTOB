from rest_framework import serializers
from core.models import Order, OrderItem

class OrderItemSerializer(serializers.ModelSerializer):
    product = serializers.SerializerMethodField()
    selected_options = serializers.SerializerMethodField()
    selected_options_details = serializers.SerializerMethodField()

    class Meta:
        model = OrderItem
        fields = '__all__'
        
    def get_product(self, obj):
        from .product import ProductSerializer
        return ProductSerializer(obj.product, context=self.context).data

    def get_selected_options(self, obj):
        return obj.selected_options.all().values_list('id', flat=True)

    def get_selected_options_details(self, obj):
        from .product import ProductAttributeOptionSerializer
        return ProductAttributeOptionSerializer(obj.selected_options.all(), many=True).data

class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    supplier = serializers.SerializerMethodField()
    payment_transaction = serializers.SerializerMethodField()
    
    class Meta:
        model = Order
        fields = '__all__'
        
    def get_supplier(self, obj):
        from .buyer import SupplierSerializer
        return SupplierSerializer(obj.supplier, context=self.context).data

    def get_payment_transaction(self, obj):
        from .payment import PaymentTransactionSerializer
        tx = obj.payment_transactions.first() # Our logic usually creates one per order
        if tx:
            return PaymentTransactionSerializer(tx, context=self.context).data
        return None
