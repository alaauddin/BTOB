from rest_framework import serializers
from core.models import Supplier, SupplierAdPlatfrom, PlatformOfferAd
from .base import SupplierCategorySerializer, CurrencySerializer

class SupplierSerializer(serializers.ModelSerializer):
    max_offer_discount = serializers.DecimalField(max_digits=5, decimal_places=2, read_only=True)
    offers_count = serializers.IntegerField(read_only=True)
    category = SupplierCategorySerializer(many=True, read_only=True)
    currency = CurrencySerializer(read_only=True)
    currency_id = serializers.PrimaryKeyRelatedField(
        queryset=Supplier.objects.none(), source='currency', write_only=True, required=False, allow_null=True
    )
    
    class Meta:
        model = Supplier
        fields = '__all__'

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        from core.models import Currency
        if 'currency_id' in self.fields:
            self.fields['currency_id'].queryset = Currency.objects.all()

class SupplierAdSerializer(serializers.ModelSerializer):
    supplier = serializers.PrimaryKeyRelatedField(read_only=True)
    class Meta:
        model = SupplierAdPlatfrom
        fields = '__all__'

class PlatformOfferAdSerializer(serializers.ModelSerializer):
    product = serializers.SerializerMethodField()
    
    class Meta:
        model = PlatformOfferAd
        fields = '__all__'
        
    def get_product(self, obj):
        from .product import ProductSerializer
        return ProductSerializer(obj.product, context=self.context).data
