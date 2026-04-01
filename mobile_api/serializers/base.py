from rest_framework import serializers
from core.models import Currency, Category, SupplierCategory, ShippingAddress

class CurrencySerializer(serializers.ModelSerializer):
    class Meta:
        model = Currency
        fields = ['id', 'name', 'code', 'symbol']

class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = '__all__'

class SupplierCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = SupplierCategory
        fields = ['id', 'name', 'producing_family']

class ShippingAddressSerializer(serializers.ModelSerializer):
    """Shipping address details for merchant order view."""
    class Meta:
        model = ShippingAddress
        fields = '__all__'
