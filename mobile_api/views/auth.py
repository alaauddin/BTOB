from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.utils.crypto import get_random_string
import re

from .helpers import (
    get_tokens_for_user, _get_manageable_merchants, _merchant_list_data
)
from ..serializers import (
    LoginSerializer, SignupSerializer, 
    UnifiedAuthSerializer, UserSerializer,
    PasswordResetRequestSerializer
)

class LoginAPIView(APIView):
    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if serializer.is_valid():
            user = authenticate(
                username=serializer.validated_data['username'],
                password=serializer.validated_data['password']
            )
            if user:
                # Check for Driver profile first
                from core.models import DeliveryDriver
                driver = DeliveryDriver.objects.filter(user=user, is_active=True).first()
                if driver:
                    tokens = get_tokens_for_user(user)
                    return Response({
                        'success': True,
                        'message': 'Driver login successful',
                        'tokens': tokens,
                        'user': UserSerializer(user).data,
                        'user_scope': 'driver',
                        'driver_id': driver.id,
                        'supplier_name': driver.supplier.name
                    })

                manageable = _get_manageable_merchants(user)
                is_merchant = user.is_superuser or manageable.exists()

                if not is_merchant:
                    return Response({
                        'success': False,
                        'message': 'Access Denied: You must be a Merchant or Manager to login here.'
                    }, status=status.HTTP_403_FORBIDDEN)

                tokens = get_tokens_for_user(user)
                merchant_data = _merchant_list_data(user, manageable, request)
                active_merchant_id = merchant_data[0]['id'] if merchant_data else None

                return Response({
                    'success': True,
                    'message': 'Login successful',
                    'tokens': tokens,
                    'user': UserSerializer(user).data,
                    'user_scope': 'merchant',
                    'manageable_merchants': merchant_data,
                    'active_merchant_id': active_merchant_id,
                })
            return Response({'success': False, 'message': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class SignupAPIView(APIView):
    def post(self, request):
        serializer = SignupSerializer(data=request.data)
        if serializer.is_valid():
            username = serializer.validated_data['username']
            if User.objects.filter(username=username).exists():
                return Response({'success': False, 'message': 'Username already exists'}, status=status.HTTP_400_BAD_REQUEST)
            
            user = User.objects.create_user(
                username=username,
                email=f"{username}@rawaage.com",
                password=serializer.validated_data['password'],
                first_name=serializer.validated_data.get('first_name', '')
            )
            tokens = get_tokens_for_user(user)
            return Response({
                'success': True,
                'message': 'Signup successful',
                'tokens': tokens,
                'user': UserSerializer(user).data
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class UnifiedAuthAPIView(APIView):
    def post(self, request):
        serializer = UnifiedAuthSerializer(data=request.data)
        if serializer.is_valid():
            raw_phone = serializer.validated_data['phone']
            
            # Yemeni Phone Normalization & Validation logic
            # Remove any spaces, hyphens, or brackets
            normalized = re.sub(r'[\s\-\(\)]', '', raw_phone)
            
            # Strip standard Yemeni prefixes for normalization
            if normalized.startswith('+967'):
                normalized = normalized[4:]
            elif normalized.startswith('00967'):
                normalized = normalized[5:]
            
            # Now we should have exactly 9 digits starting with 7
            if not (len(normalized) == 9 and normalized.startswith('7')):
                return Response({
                    'success': False,
                    'message': 'Invalid Yemeni phone format. Example: +967 77X XXX XXX'
                }, status=status.HTTP_400_BAD_REQUEST)
                
            # Formatting as standard prefixed username for the database
            normalized_username = f"+967{normalized}"

            user = User.objects.filter(username=normalized_username).first()
            # Also check if they mistakenly exist without prefix just in case
            if not user:
                 user = User.objects.filter(username=normalized).first()
            
            if user:
                tokens = get_tokens_for_user(user)
                return Response({
                    'success': True,
                    'message': 'Login successful',
                    'is_new': False,
                    'tokens': tokens,
                    'user': UserSerializer(user).data
                })
            else:
                random_password = get_random_string(length=12)
                user = User.objects.create_user(
                    username=normalized_username,
                    email=f"{normalized_username}@aratatt.com",
                    password=random_password,
                    first_name=""
                )
                tokens = get_tokens_for_user(user)
                return Response({
                    'success': True,
                    'message': 'Signup successful',
                    'is_new': True,
                    'tokens': tokens,
                    'user': UserSerializer(user).data
                }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class PasswordResetRequestAPIView(APIView):
    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        if serializer.is_valid():
            # In a real app, send OTP/Reset Link via WhatsApp/Email
            # For now, just return success if user exists
            return Response({
                'success': True,
                'message': 'If an account exists for this phone, you will receive instructions.'
            })
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
