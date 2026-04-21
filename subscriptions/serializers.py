from rest_framework import serializers
from .models import Plan, PlanFeature, Subscription, SubscriptionPaymentMethod, PaymentMethodField, SubscriptionPayment

class PaymentMethodFieldSerializer(serializers.ModelSerializer):
    class Meta:
        model = PaymentMethodField
        fields = ['id', 'label', 'field_type', 'is_required', 'placeholder', 'validation_regex']

class SubscriptionPaymentMethodSerializer(serializers.ModelSerializer):
    fields = PaymentMethodFieldSerializer(many=True, read_only=True)
    class Meta:
        model = SubscriptionPaymentMethod
        fields = ['id', 'name', 'logo', 'instructions', 'fields']

class PlanFeatureSerializer(serializers.ModelSerializer):
    class Meta:
        model = PlanFeature
        fields = ['id', 'title', 'is_included']

class PlanSerializer(serializers.ModelSerializer):
    features = PlanFeatureSerializer(many=True, read_only=True)
    class Meta:
        model = Plan
        fields = '__all__'

class SubscriptionSerializer(serializers.ModelSerializer):
    plan_name = serializers.CharField(source='plan.name', read_only=True)
    days_left = serializers.SerializerMethodField()

    class Meta:
        model = Subscription
        fields = ['id', 'plan', 'plan_name', 'start_date', 'end_date', 'status', 'is_trial', 'days_left']

    def get_days_left(self, obj):
        from django.utils import timezone
        if obj.end_date > timezone.now():
            return (obj.end_date - timezone.now()).days
        return 0

class SubscriptionPaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = SubscriptionPayment
        fields = '__all__'
