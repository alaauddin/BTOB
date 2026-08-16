from django.shortcuts import render, redirect
from django.contrib.auth.forms import UserCreationForm
from django.contrib.auth import login as auth_login
from django.contrib.auth import authenticate
from django.http import JsonResponse
import json
from django.views.decorators.csrf import csrf_exempt

from .forms import  SignUpForm
from django.views.generic import UpdateView
from django.views.generic import CreateView

from django.urls import reverse_lazy, reverse
from django.contrib.auth.models import User
from django.utils.crypto import get_random_string
from django.core.cache import cache
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
from django.contrib import messages
import time


# Create your views here.



def signup (request):
    form = SignUpForm()
    if request.method == "POST":
        
        form = SignUpForm(request.POST)
        if form.is_valid():
            user = form.save(commit=False)
            # Auto-generate email from phone number
            user.email = f"{user.username}@aratatt.com"
            user.save()
            
            auth_login(request, user, backend='django.contrib.auth.backends.ModelBackend')
            return redirect('suppliers_list')
           
           

    return render(request, 'signup.html', {'form':form})


def login_view(request):
    """
    Render the standalone login page using login.html template.
    Redirects authenticated users to the homepage.
    """
    if request.user.is_authenticated:
        return redirect(request.GET.get('next', '/'))

    from .forms import UserLoginForm
    form = UserLoginForm()

    if request.method == 'POST':
        form = UserLoginForm(request, data=request.POST)
        if form.is_valid():
            user = form.get_user()
            auth_login(request, user)
            next_url = request.POST.get('next') or request.GET.get('next', '/')
            return redirect(next_url)

    return render(request, 'login.html', {'form': form})



    
class UserUpdateView(UpdateView):
    model=User
    fields =('first_name','last_name', 'email',)
    template_name = 'edit_profile.html'
    success_url = reverse_lazy('user_profile')

    def get_object(self):
        return self.request.user
    




# def create_or_update_contact(request):
#     # person_postion, created = PersonPostion.objects.get_or_create(user=request.user)
    
#     form = PersonPostionFormEdit(request.POST or None, instance=person_postion)
#     if form.is_valid():
#         form.save()
#         return redirect(request.GET.get('next', 'meetings_index'))
    
#     return render(request, 'contact_info.html', {'form': form})


def logout(request):
    request.session.flush()
    return redirect('suppliers_list')

def ajax_login_view(request):
    """
    Handle AJAX login requests.
    Expects JSON data: {'username': '...', 'password': '...'}
    """
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            username = data.get('username')
            password = data.get('password')
            
            user = authenticate(request, username=username, password=password)
            
            if user is not None:
                auth_login(request, user)
                return JsonResponse({
                    'success': True, 
                    'message': 'Login successful',
                    'username': user.username
                })
            else:
                return JsonResponse({
                    'success': False, 
                    'message': 'Invalid credentials'
                })
        except json.JSONDecodeError:
            return JsonResponse({'success': False, 'message': 'Invalid JSON'}, status=400)
            
@csrf_exempt
def ajax_signup_view(request):
    """
    Handle AJAX signup requests.
    Expects JSON data: {'username': '...', 'first_name': '...', 'password': '...'}
    """
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            form = SignUpForm(data)
            if form.is_valid():
                user = form.save(commit=False)
                # Auto-generate email from phone number
                user.email = f"{user.username}@aratatt.com"
                user.save()
                
                auth_login(request, user, backend='django.contrib.auth.backends.ModelBackend')
                return JsonResponse({
                    'success': True, 
                    'message': 'Signup successful',
                    'username': user.username
                })
            else:
                # Get form errors
                errors = {}
                for field, error_list in form.errors.items():
                    errors[field] = error_list[0]
                return JsonResponse({
                    'success': False, 
                    'message': 'يرجى تصحيح الأخطاء',
                    'errors': errors
                })
        except json.JSONDecodeError:
            return JsonResponse({'success': False, 'message': 'Invalid JSON'}, status=400)
            
    return JsonResponse({'success': False, 'message': 'Method not allowed'}, status=405)
    
@csrf_exempt
def ajax_merchant_login_view(request):
    """
    Handle AJAX merchant login requests.
    Expects JSON data: {'username': '...', 'password': '...'}
    Supports merchants (suppliers) and delivery drivers.
    """
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            username = data.get('username')
            password = data.get('password')
            
            user = authenticate(request, username=username, password=password)
            
            if user is not None:
                # Check if user is a supplier (or superuser)
                if hasattr(user, 'supplier') or user.is_superuser:
                    auth_login(request, user)
                    return JsonResponse({
                        'success': True, 
                        'message': 'تم تسجيل دخول التاجر بنجاح',
                        'redirect_url': '/my-merchant/'
                    })

                # Check if user is a delivery driver
                from core.models import DeliveryDriver
                driver = DeliveryDriver.objects.filter(user=user, is_active=True).first()
                if driver:
                    auth_login(request, user)
                    return JsonResponse({
                        'success': True, 
                        'message': f'مرحباً {user.get_full_name() or user.username}',
                        'redirect_url': '/driver-dashboard/'
                    })

                return JsonResponse({
                    'success': False, 
                    'message': 'هذا الحساب غير مسجل كتاجر أو سائق. يرجى استخدام حساب صالح أو الانضمام إلينا.'
                })
            else:
                return JsonResponse({
                    'success': False, 
                    'message': 'اسم المستخدم أو كلمة المرور غير صحيحة'
                })
        except json.JSONDecodeError:
            return JsonResponse({'success': False, 'message': 'Invalid JSON'}, status=400)
            
    return JsonResponse({'success': False, 'message': 'Method not allowed'}, status=405)


@csrf_exempt
def ajax_unified_auth_view(request):
    """
    Handle Unified Authentication (Phone Only).
    Expects JSON data: {'phone': '...'}
    """
    if request.method == 'POST':
        try:
            # Basic Rate Limiting (IP based)
            ip = request.META.get('REMOTE_ADDR')
            cache_key = f"auth_rate_limit_{ip}"
            attempts = cache.get(cache_key, 0)
            
            if attempts > 10: # 10 attempts per minute
                return JsonResponse({'success': False, 'message': 'Too many attempts. Please try again later.'})
            
            cache.set(cache_key, attempts + 1, 60) # Expire in 60s

            try:
                data = json.loads(request.body)
            except json.JSONDecodeError:
                return JsonResponse({'success': False, 'message': 'Invalid JSON'}, status=400)

            phone = data.get('phone')

            if not phone:
                return JsonResponse({'success': False, 'message': 'رقم الهاتف مطلوب'})

            # Check if user exists
            user = User.objects.filter(username=phone).first()

            if user:
                # Login existing user without password check
                auth_login(request, user, backend='django.contrib.auth.backends.ModelBackend')
                return JsonResponse({
                    'success': True, 
                    'message': 'تم تسجيل الدخول بنجاح',
                    'username': user.username
                })
            else:
                # Create New User with random password
                random_password = get_random_string(length=12)
                user = User.objects.create_user(
                    username=phone,
                    email=f"{phone}@aratatt.com",
                    password=random_password,
                    first_name="" # Deferred to checkout
                )
                user.save()
                
                # Log them in immediately
                auth_login(request, user, backend='django.contrib.auth.backends.ModelBackend')
                
                return JsonResponse({
                    'success': True, 
                    'message': 'تم إنشاء الحساب بنجاح',
                    'is_new': True,
                    'username': user.username
                })

        except Exception as e:
            # Catch ALL errors to prevent 500 HTML response
            import traceback
            traceback.print_exc() # Print to server logs
            return JsonResponse({
                'success': False, 
                'message': f'System Error: {str(e)}'
            }, status=200) # Return 200 so frontend displays message instead of catch block
            
    return JsonResponse({'success': False, 'message': 'Method not allowed'}, status=405)
@csrf_exempt
def ajax_password_reset_request(request):
    """
    Handle AJAX password reset requests.
    Generates a secure password reset link and sends it to the user via WhatsApp.
    Only available to suppliers.
    """
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            phone = data.get('phone')
            
            from core.models import SystemSettings
            settings = SystemSettings.objects.first()
            support_phone = settings.whatsapp_number if settings and settings.whatsapp_number else (settings.customer_service_number if settings else "+967777777777")

            if not phone:
                return JsonResponse({
                    'success': True,
                    'is_forgot_both': True,
                    'support_phone': support_phone,
                    'message': 'يرجى إدخال رقم الهاتف، أو التواصل مع الدعم الفني لاستعادة بيانات حسابك.'
                })
            
            from core.db.profile import Profile
            from django.db.models import Q
            
            # Clean up the phone input (e.g. 777747141)
            clean_phone = phone.strip().lstrip('+').lstrip('00')
            if clean_phone.startswith('967'):
                clean_phone = clean_phone[3:]
            
            profile = Profile.objects.filter(
                Q(phone_number=clean_phone) | 
                Q(phone_number=f"+967{clean_phone}") | 
                Q(phone_number=f"00967{clean_phone}") |
                Q(phone_number=f"967{clean_phone}"),
                user_type='supplier'
            ).first()
            
            if profile and profile.user:
                user = profile.user
                phone_number = profile.phone_number

                # 1. Generate token and encoded user ID
                uidb64 = urlsafe_base64_encode(force_bytes(user.pk))
                token = default_token_generator.make_token(user)
                
                # 2. Build absolute reset URL
                reset_path = reverse('password_reset_confirm', kwargs={'uidb64': uidb64, 'token': token})
                reset_url = request.build_absolute_uri(reset_path)
                
                # 3. Send link via WhatsApp
                from core.utils.whatsapp_utils import send_whatsapp_message
                wa_message = f"مرحباً {user.first_name or user.username}،\nلقد طلبت إعادة تعيين كلمة المرور لحسابك كتاجر.\nالرجاء النقر على الرابط التالي لإنشاء كلمة مرور جديدة:\n\n{reset_url}\n\nهذا الرابط صالح لمرة واحدة. إذا لم تطلب هذا، يمكنك تجاهل هذه الرسالة."
                send_whatsapp_message(phone_number, wa_message)
                
                return JsonResponse({
                    'success': True,
                    'message': f'تم إرسال رابط إعادة تعيين كلمة المرور إلى الرقم {phone_number}. يرجى التحقق من الرسائل في تطبيق واتساب.',
                    'support_phone': support_phone,
                    'phone': phone
                })
            else:
                return JsonResponse({
                    'success': False,
                    'message': 'لم يتم العثور على حساب بهذا الهاتف. يرجى التأكد من البيانات أو الانضمام كتاجر جديد.'
                })
        except json.JSONDecodeError:
            return JsonResponse({'success': False, 'message': 'Invalid JSON'}, status=400)
            
    return JsonResponse({'success': False, 'message': 'Method not allowed'}, status=405)


def password_reset_confirm_view(request, uidb64, token):
    """
    Handle the destination link of the password reset URL.
    Validates the token and allows the user to post a new password.
    """
    try:
        uid = force_str(urlsafe_base64_decode(uidb64))
        user = User.objects.get(pk=uid)
    except (TypeError, ValueError, OverflowError, User.DoesNotExist):
        user = None

    if user is not None and default_token_generator.check_token(user, token):
        if request.method == 'POST':
            new_password = request.POST.get('new_password')
            confirm_password = request.POST.get('confirm_password')

            if new_password and confirm_password:
                if new_password == confirm_password:
                    if len(new_password) < 6:
                        messages.error(request, 'يجب أن تتكون كلمة المرور من 6 أحرف أو أرقام على الأقل.')
                    else:
                        user.set_password(new_password)
                        user.save()
                        
                        # Send WhatsApp confirmation with username and new password
                        phone_number = None
                        if hasattr(user, 'profile'):
                            phone_number = user.profile.phone_number
                        
                        if phone_number:
                            from core.utils.whatsapp_utils import send_whatsapp_message
                            wa_message = f"مرحباً {user.first_name or user.username}،\nتم إعادة تعيين كلمة المرور الخاصة بك بنجاح.\n\nبيانات الدخول لحسابك:\nاسم المستخدم: {user.username}\nكلمة المرور الجديدة: {new_password}\n\nنتمنى لك يوماً سعيداً."
                            send_whatsapp_message(phone_number, wa_message)

                        messages.success(request, 'تم إعادة تعيين كلمة المرور بنجاح. يمكنك الآن تسجيل الدخول.')
                        return redirect('login')  # Assuming 'login' is your standard login URL name
                else:
                    messages.error(request, 'كلمتي المرور غير متطابقتين.')
            else:
                messages.error(request, 'يرجى تعبئة جميع الحقول المطلوبة.')

        return render(request, 'password_reset_confirm.html', {'validlink': True})
    else:
        return render(request, 'password_reset_confirm.html', {'validlink': False})
