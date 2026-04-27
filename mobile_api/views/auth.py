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
    PasswordResetRequestSerializer, MerchantSignupSerializer
)

class LoginAPIView(APIView):
# ... (lines 19-65)
    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if serializer.is_valid():
            username_input = serializer.validated_data['username']
            password_input = serializer.validated_data['password']
            
            print(f"DEBUG LOGIN: username='{username_input}', password='{password_input}'")
            user = authenticate(
                username=username_input,
                password=password_input
            )
            print(f"DEBUG LOGIN: authenticate returned {user}")
            
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
            return Response({'success': False, 'message': 'اسم المستخدم أو كلمة المرور غير صحيحة'}, status=status.HTTP_401_UNAUTHORIZED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class SignupAPIView(APIView):
# ... (lines 68-88)
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

class MerchantSignupSendOTPAPIView(APIView):
    def post(self, request):
        phone = request.data.get('phone')
        if not phone:
            return Response({'success': False, 'message': 'رقم الهاتف مطلوب.'}, status=status.HTTP_400_BAD_REQUEST)
        
        phone = str(phone).strip()
        
        from core.models import Profile, OTPVerification
        import random
        from core.utils.whatsapp_utils import send_whatsapp_message
        
        if Profile.objects.filter(phone_number=phone).exists():
            return Response({'success': False, 'message': 'هذا الرقم مسجل مسبقاً، يرجى استخدام رقم آخر.'}, status=status.HTTP_400_BAD_REQUEST)
            
        otp = str(random.randint(100000, 999999))
        OTPVerification.objects.filter(phone=phone).delete()
        OTPVerification.objects.create(phone=phone, otp=otp)
        
        try:
            msg = f"رمز التحقق الخاص بك لتسجيل حساب تاجر في رواج هو: {otp}"
            send_whatsapp_message(phone, msg)
            return Response({'success': True, 'message': 'تم إرسال رمز التحقق بنجاح.'}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'success': False, 'message': f"خطأ في إرسال الرمز: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class MerchantSignupAPIView(APIView):
    def post(self, request):
        serializer = MerchantSignupSerializer(data=request.data)
        if serializer.is_valid():
            username = serializer.validated_data['username']
            if User.objects.filter(username=username).exists():
                return Response({'success': False, 'message': 'Account with this username already exists'}, status=status.HTTP_400_BAD_REQUEST)
            
            from core.models import Supplier, Profile, SupplierCategory, OTPVerification
            from django.db import transaction
            from django.utils import timezone
            from datetime import timedelta

            phone = serializer.validated_data['phone']
            store_id = serializer.validated_data['store_id']
            otp_input = serializer.validated_data['otp']

            if Profile.objects.filter(phone_number=phone).exists():
                return Response({'success': False, 'message': 'هذا الرقم مسجل مسبقاً، يرجى استخدام رقم آخر.'}, status=status.HTTP_400_BAD_REQUEST)
                
            if Supplier.objects.filter(store_id=store_id).exists():
                return Response({'success': False, 'message': 'رابط المتجر هذا مستخدم، يرجى اختيار رابط مختلف.'}, status=status.HTTP_400_BAD_REQUEST)

            expiry_time = timezone.now() - timedelta(minutes=10)

            try:
                with transaction.atomic():
                    otp_obj = OTPVerification.objects.select_for_update().filter(
                        phone=phone, 
                        otp=otp_input,
                        created_at__gte=expiry_time
                    ).first()
                    
                    if not otp_obj:
                        return Response({'success': False, 'message': 'رمز التحقق غير صحيح أو انتهت صلاحيته.'}, status=status.HTTP_400_BAD_REQUEST)

                    # 1. Create User
                    user = User.objects.create_user(
                        username=username,
                        email=f"{username}@merchant.rawaage.com",
                        password=serializer.validated_data['password'],
                        first_name=serializer.validated_data['name']
                    )

                    # 2. Update Profile
                    profile, created = Profile.objects.get_or_create(user=user)
                    profile.user_type = 'supplier'
                    profile.phone_number = serializer.validated_data['phone']
                    profile.save()

                    # 3. Create Supplier
                    supplier = Supplier.objects.create(
                        user=user,
                        name=serializer.validated_data['name'],
                        store_id=serializer.validated_data['store_id'],
                        phone=serializer.validated_data['phone'],
                        address=serializer.validated_data['address'],
                        city=serializer.validated_data['city'],
                        country=serializer.validated_data['country'],
                        primary_color=serializer.validated_data.get('primary_color', '#F58231'),
                        profile_picture=serializer.validated_data.get('profile_picture'),
                        panal_picture=serializer.validated_data.get('panal_picture'),
                        is_active=True
                    )

                    # 4. Assign Categories
                    category_ids = serializer.validated_data.get('category_ids', [])
                    if category_ids:
                        categories = SupplierCategory.objects.filter(id__in=category_ids)
                        supplier.category.set(categories)

                    tokens = get_tokens_for_user(user)
                    return Response({
                        'success': True,
                        'message': 'Merchant registration successful',
                        'tokens': tokens,
                        'user': UserSerializer(user).data,
                        'merchant_id': supplier.id
                    }, status=status.HTTP_201_CREATED)
            except Exception as e:
                import traceback
                traceback.print_exc()
                return Response({'success': False, 'message': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        print("Serializer errors:", serializer.errors)
        # Format the errors nicely to send to frontend if needed
        error_msg = next(iter(serializer.errors.values()))[0] if serializer.errors else 'Validation failed'
        return Response({'success': False, 'message': error_msg, 'errors': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

class UnifiedAuthAPIView(APIView):
# ... (lines 91-146)
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
# ... (lines 149-158)
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
