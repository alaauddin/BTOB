from rest_framework import serializers
from django.contrib.auth.models import User

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'email']

class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField()

    def validate_username(self, value):
        return value.lower()

class SignupSerializer(serializers.Serializer):
    username = serializers.CharField()
    first_name = serializers.CharField(required=False, allow_blank=True)
    password = serializers.CharField(write_only=True)

class UnifiedAuthSerializer(serializers.Serializer):
    phone = serializers.CharField()

class PasswordResetRequestSerializer(serializers.Serializer):
    username = serializers.CharField()

class MerchantSignupSerializer(serializers.Serializer):
    # Step 1: Account Info
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)
    
    # Step 2: Store Identity
    name = serializers.CharField()
    store_id = serializers.SlugField() # This will be the subdomain
    category_ids = serializers.ListField(
        child=serializers.IntegerField(), 
        required=False,
        help_text="List of SupplierCategory IDs"
    )
    
    # Step 3: Business & Branding
    phone = serializers.CharField()
    address = serializers.CharField()
    city = serializers.CharField()
    country = serializers.CharField(default='Yemen')
    primary_color = serializers.CharField(default='#F58231', required=False)
    
    # Step 4: Visual Identity (Images)
    profile_picture = serializers.ImageField(required=False, allow_null=True)
    panal_picture = serializers.ImageField(required=False, allow_null=True)
    
    # Step 5: Verification
    otp = serializers.CharField(required=True)

    def validate_username(self, value):
        import re
        if not re.search(r'[a-zA-Z]', value):
            raise serializers.ValidationError("Username must contain at least one letter and cannot be just a phone number.")
        if not re.match(r'^[a-zA-Z0-9_]+$', value):
            raise serializers.ValidationError("Username can only contain letters, numbers, and underscores.")
        return value
