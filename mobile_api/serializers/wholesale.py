from rest_framework import serializers
from core.db.wholesale import WholesaleSupplier, WholesaleProduct, WholesaleProductImage

class WholesaleProductImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = WholesaleProductImage
        fields = ['id', 'image']

class WholesaleSupplierSerializer(serializers.ModelSerializer):
    class Meta:
        model = WholesaleSupplier
        fields = ['id', 'name', 'phone', 'address']

class WholesaleProductSerializer(serializers.ModelSerializer):
    wholesaler_name = serializers.ReadOnlyField(source='wholesaler.name')
    category_name = serializers.ReadOnlyField(source='category.name')
    additional_images = WholesaleProductImageSerializer(many=True, read_only=True)
    potential_profit = serializers.ReadOnlyField()
    is_inherited = serializers.SerializerMethodField()

    class Meta:
        model = WholesaleProduct
        fields = [
            'id', 'wholesaler_name', 'category_name', 'name', 'description',
            'purchase_price', 'sale_price', 'potential_profit', 'stock',
            'image', 'video', 'additional_images', 'is_inherited'
        ]

    def get_is_inherited(self, obj):
        context = self.context
        # Use active_supplier from view if available, otherwise fallback to request.user.supplier
        supplier = context.get('active_supplier')
        
        if not supplier:
            request = context.get('request')
            if request and hasattr(request.user, 'supplier'):
                supplier = request.user.supplier

        if supplier:
            from core.db.product import Product
            return Product.objects.filter(
                supplier=supplier,
                wholesale_origin=obj
            ).exists()
        return False
