from rest_framework import serializers
from core.models import PaymentMethod, SupplierPaymentMethod, PaymentTransaction

class PaymentMethodSerializer(serializers.ModelSerializer):
    """Serializer for global payment methods (e.g. Kuraimi, Cash)."""
    class Meta:
        model = PaymentMethod
        fields = ['id', 'name', 'logo', 'requires_proof', 'is_active']

class SupplierPaymentMethodSerializer(serializers.ModelSerializer):
    """Serializer for a specific supplier's payment configuration."""
    method_name = serializers.ReadOnlyField(source='payment_method.name')
    method_logo = serializers.ImageField(source='payment_method.logo', read_only=True)
    requires_proof = serializers.BooleanField(source='payment_method.requires_proof', read_only=True)

    class Meta:
        model = SupplierPaymentMethod
        fields = [
            'id', 'payment_method', 'method_name', 'method_logo', 
            'account_field_name', 'account_field_value', 'is_active', 'requires_proof'
        ]

class PaymentTransactionSerializer(serializers.ModelSerializer):
    """Serializer for customer payment submissions (receipts)."""
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    method_name = serializers.ReadOnlyField(source='supplier_payment_method.payment_method.name')

    class Meta:
        model = PaymentTransaction
        fields = [
            'id', 'order', 'supplier_payment_method', 'method_name',
            'receipt', 'status', 'status_display', 'verification_notes', 'created_at'
        ]
