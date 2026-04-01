from rest_framework import serializers
from django.contrib.auth.models import User

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'email']

class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField()

class SignupSerializer(serializers.Serializer):
    username = serializers.CharField()
    first_name = serializers.CharField(required=False, allow_blank=True)
    password = serializers.CharField(write_only=True)

class UnifiedAuthSerializer(serializers.Serializer):
    phone = serializers.CharField()

class PasswordResetRequestSerializer(serializers.Serializer):
    username = serializers.CharField()
