import random
from django.shortcuts import render, redirect
from django.contrib import messages
from django.contrib.auth.models import User
from django.contrib.auth import login as auth_login
from django.db import transaction
from core.forms import MerchantSignupForm
from core.models import SystemSettings, Supplier, OTPVerification
from core.utils.whatsapp_utils import send_whatsapp_message

def join_business(request):
    # Redirect authenticated users
    if request.user.is_authenticated:
        if hasattr(request.user, 'supplier'):
            return redirect('my_merchant')
        return redirect('suppliers_list')

    if request.method == 'POST':
        form = MerchantSignupForm(request.POST)
        if form.is_valid():
            # Programmatically generate email from phone number
            phone = form.cleaned_data['phone']
            form.cleaned_data['email'] = f"{phone}@aratatt.com"
            
            # Store data in session
            request.session['merchant_signup_data'] = form.cleaned_data
            
            # Generate OTP
            otp = str(random.randint(100000, 999999))
            OTPVerification.objects.filter(phone=phone).delete()
            OTPVerification.objects.create(phone=phone, otp=otp)
            
            # Send OTP via WhatsApp
            try:
                msg = f"رمز التحقق الخاص بك هو: {otp}"
                send_whatsapp_message(phone, msg)
                messages.info(request, "تم إرسال رمز التحقق إلى الواتساب الخاص بك.")
                return redirect('verify_signup_otp')
            except Exception as e:
                messages.error(request, f"خطأ في إرسال الرمز: {str(e)}")
    else:
        form = MerchantSignupForm()
    
    return render(request, 'join_business.html', {'business_form': form})

def verify_signup_otp(request):
    # Redirect authenticated users
    if request.user.is_authenticated:
        if hasattr(request.user, 'supplier'):
            return redirect('my_merchant')
        return redirect('suppliers_list')

    signup_data = request.session.get('merchant_signup_data')
    if not signup_data:
        messages.error(request, "جلسة التسجيل انتهت صلاحيتها.")
        return redirect('join_business')
    
    phone = signup_data.get('phone')
    
    if request.method == 'POST':
        otp_input = request.POST.get('otp')
        
        # Check OTP with 10-minute expiration
        from django.utils import timezone
        from datetime import timedelta
        expiry_time = timezone.now() - timedelta(minutes=10)
        
        # We use transaction.atomic and select_for_update to handle potential race conditions
        try:
            with transaction.atomic():
                otp_obj = OTPVerification.objects.select_for_update().filter(
                    phone=phone, 
                    otp=otp_input,
                    created_at__gte=expiry_time
                ).first()
                
                if not otp_obj:
                    messages.error(request, 'رمز التحقق غير صحيح أو انتهت صلاحيته.')
                    return render(request, 'verify_otp.html', {'phone': phone})

                # Pre-check username uniqueness within the transaction
                if User.objects.filter(username=signup_data['username']).exists():
                    otp_obj.delete() # Consumed anyway to prevent bypass
                    messages.error(request, 'اسم المستخدم هذا تم حجزه بالفعل، يرجى العودة والتسجيل باسم آخر.')
                    return render(request, 'verify_otp.html', {'phone': phone})

                # 1. Create User
                user = User.objects.create_user(
                    username=signup_data['username'],
                    password=signup_data['password'],
                    email=signup_data['email']
                )
                
                # 2. Create Supplier
                supplier = Supplier.objects.create(
                    user=user,
                    name=signup_data['business_name'],
                    phone=signup_data['phone'],
                    secondary_phone=signup_data.get('secondary_phone'),
                    city=signup_data['city'],
                    country=signup_data['country'],
                    address=f"نوع النشاط: {signup_data['business_type']}",
                    is_active=False,
                    show_system_logo=False,
                    store_id=signup_data['username']
                )
                
                # Success! Delete OTP and commit
                otp_obj.delete()

            # --- Outside Transaction (Side Effects) ---
            
            # Admin Notification
            try:
                settings = SystemSettings.objects.first()
                if settings and settings.whatsapp_number:
                    admin_msg = (
                        f"*تم إنشاء حساب تاجر جديد وتحقق من هاتفه*\n\n"
                        f"*اسم النشاط:* {supplier.name}\n"
                        f"*اسم المالك:* {signup_data['owner_name']}\n"
                        f"*رقم الهاتف:* {supplier.phone}\n"
                        f"*البريد الإلكتروني:* {user.email}\n"
                        f"*نوع النشاط:* {signup_data['business_type']}\n"
                    )
                    send_whatsapp_message(settings.whatsapp_number, admin_msg)
            except: pass

            # User Welcoming Notification
            try:
                login_url = request.build_absolute_uri('/login/')
                welcome_msg = (
                    f"أهلاً بك يا *{signup_data['owner_name']}* في عائلة رواج! 🌟\n\n"
                    f"لقد تم تفعيل رقمك وإنشاء حسابك لمتجر *({supplier.name})*.\n\n"
                    f"🔹 *رابط تسجيل الدخول:* {login_url}\n"
                    f"🔹 *اسم المستخدم:* {user.username}\n"
                    f"🔹 *كلمة المرور:* {signup_data['password']}\n"
                    f"🔹 *الحالة:* قيد المراجعة حالياً\n\n"
                    f"سيقوم فريقنا بتنشيط حسابك قريباً جداً. تصفح لوحة التحكم الآن! 🚀"
                )
                send_whatsapp_message(phone, welcome_msg)
            except: pass
            
            # Log user in (flushes session)
            auth_login(request, user, backend='django.contrib.auth.backends.ModelBackend')
            
            messages.success(request, f'مرحباً بك! تم إنشاء حسابك وهو قيد المراجعة حالياً.')
            return redirect('my_merchant')

        except Exception as e:
            # Check if it's already created (e.g. concurrent request succeeded)
            if User.objects.filter(username=signup_data['username']).exists():
                user = User.objects.get(username=signup_data['username'])
                auth_login(request, user)
                return redirect('my_merchant')
            
            messages.error(request, f'حدث خطأ أثناء إنشاء الحساب: {str(e)}')
            
    return render(request, 'verify_otp.html', {'phone': phone})
