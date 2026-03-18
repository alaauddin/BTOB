import random
from django.shortcuts import render, redirect
from django.contrib import messages
from django.contrib.auth.models import User
from django.contrib.auth import login as auth_login
from django.db import transaction
from core.forms import MerchantSignupForm
from core.models import SystemSettings, Supplier, OTPVerification
from core.utils.whatsapp_utils import send_whatsapp_message

from django.http import JsonResponse

def join_business(request):
    # Redirect authenticated users
    if request.user.is_authenticated:
        if hasattr(request.user, 'supplier'):
            return redirect('my_merchant')
        return redirect('suppliers_list')

    if request.headers.get('x-requested-with') == 'XMLHttpRequest':
        action = request.POST.get('action')
        form = MerchantSignupForm(request.POST)

        if action == 'validate_step':
            step = int(request.POST.get('step', 1))
            # Define which fields belong to which step
            step_fields = {
                1: ['username', 'password', 'password_confirm'],
                2: ['business_name', 'owner_name'],
                3: ['city', 'country'],
                4: ['business_type', 'phone', 'secondary_phone']
            }
            
            fields = step_fields.get(step, [])
            errors = {}
            
            # We validate the whole form but only collect errors for the current step's fields
            form.is_valid()
            for field in fields:
                if field in form.errors:
                    errors[field] = form.errors[field]
            
            if errors:
                return JsonResponse({'success': False, 'errors': errors})
            return JsonResponse({'success': True})

        elif action == 'send_otp':
            if form.is_valid():
                phone = form.cleaned_data['phone']
                request.session['merchant_signup_data'] = form.cleaned_data
                
                otp = str(random.randint(100000, 999999))
                OTPVerification.objects.filter(phone=phone).delete()
                OTPVerification.objects.create(phone=phone, otp=otp)
                
                try:
                    msg = f"رمز التحقق الخاص بك هو: {otp}"
                    send_whatsapp_message(phone, msg)
                    return JsonResponse({'success': True, 'message': "تم إرسال رمز التحقق بنجاح."})
                except Exception as e:
                    return JsonResponse({'success': False, 'error': f"خطأ في إرسال الرمز: {str(e)}"})
            else:
                return JsonResponse({'success': False, 'errors': form.errors})

        elif action == 'verify_otp':
            otp_input = request.POST.get('otp')
            signup_data = request.session.get('merchant_signup_data')
            
            if not signup_data:
                return JsonResponse({'success': False, 'error': "انتهت جلسة التسجيل، يرجى إعادة المحاولة."})
            
            phone = signup_data.get('phone')
            from django.utils import timezone
            from datetime import timedelta
            expiry_time = timezone.now() - timedelta(minutes=10)
            
            try:
                with transaction.atomic():
                    otp_obj = OTPVerification.objects.select_for_update().filter(
                        phone=phone, 
                        otp=otp_input,
                        created_at__gte=expiry_time
                    ).first()
                    
                    if not otp_obj:
                        return JsonResponse({'success': False, 'error': "رمز التحقق غير صحيح أو انتهت صلاحيته."})

                    if User.objects.filter(username=signup_data['username']).exists():
                        return JsonResponse({'success': False, 'error': "اسم المستخدم محجوز بالفعل."})

                    # 1. Create User
                    user = User.objects.create_user(
                        username=signup_data['username'],
                        password=signup_data['password'],
                        email=f"{signup_data['phone']}@aratatt.com"
                    )
                    
                    # 2. Create Supplier
                    import re
                    store_id = signup_data['username']
                    if not re.match(r'^[a-zA-Z0-9_-]+$', store_id):
                        store_id = f"store-{signup_data['phone'][-6:]}-{random.randint(100, 999)}"
                    
                    supplier = Supplier.objects.create(
                        user=user,
                        name=signup_data['business_name'],
                        phone=signup_data['phone'],
                        secondary_phone=signup_data.get('secondary_phone'),
                        city=signup_data['city'],
                        country=signup_data['country'],
                        address=f"نوع النشاط: {signup_data['business_type']}",
                        is_active=False,
                        store_id=store_id
                    )
                    
                    otp_obj.delete()
                    del request.session['merchant_signup_data']

                auth_login(request, user, backend='django.contrib.auth.backends.ModelBackend')
                return JsonResponse({'success': True, 'redirect_url': '/my-merchant/'})

            except Exception as e:
                return JsonResponse({'success': False, 'error': str(e)})

    # Regular GET request
    form = MerchantSignupForm()
    return render(request, 'join_business.html', {'business_form': form})

def verify_signup_otp(request):
    return redirect('join_business')

