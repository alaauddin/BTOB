from rest_framework import serializers
from core.models import DeliveryDriver, DriverLocation, Order, OrderItem, ShippingAddress
from .merchant import MerchantMiniSerializer, MerchantOrderItemSerializer


class DeliveryDriverMiniSerializer(serializers.ModelSerializer):
    """Compact serializer for driver profile info."""
    supplier = MerchantMiniSerializer(read_only=True)
    full_name = serializers.CharField(source='user.get_full_name', read_only=True)
    
    class Meta:
        model = DeliveryDriver
        fields = ['id', 'full_name', 'phone', 'supplier', 'is_active']

class DriverOrderSerializer(serializers.ModelSerializer):
    """Order details for the driver dashboard."""
    items = MerchantOrderItemSerializer(source='order_items', many=True, read_only=True)
    customer_name = serializers.SerializerMethodField()
    status_name = serializers.CharField(source='pipeline_status.name', read_only=True)
    status_slug = serializers.CharField(source='pipeline_status.slug', read_only=True)
    shipping = serializers.SerializerMethodField()
    next_step_name = serializers.SerializerMethodField()
    
    class Meta:
        model = Order
        fields = [
            'id', 'customer_name', 'total_amount', 'created_at', 
            'status_name', 'status_slug', 'items', 'shipping', 'next_step_name'
        ]

    def get_customer_name(self, obj):
        return obj.user.get_full_name() or obj.user.username

    def get_shipping(self, obj):
        addr = obj.shippingaddress_set.first()
        if not addr: return None
        return {
            'phone': addr.phone,
            'address_line1': addr.address_line1,
            'address_line2': addr.address_line2,
            'city': addr.city,
            'latitude': str(addr.latitude) if addr.latitude else None,
            'longitude': str(addr.longitude) if addr.longitude else None,
        }

    def get_next_step_name(self, obj):
        next_status = obj.get_next_status()
        return next_status.name if next_status else None

class DriverLocationSerializer(serializers.ModelSerializer):
    """Serializer for driver live tracking updates."""
    latitude = serializers.DecimalField(max_digits=9, decimal_places=6)
    longitude = serializers.DecimalField(max_digits=9, decimal_places=6)

    class Meta:
        model = DriverLocation
        fields = ['latitude', 'longitude', 'timestamp']
        read_only_fields = ['timestamp']
