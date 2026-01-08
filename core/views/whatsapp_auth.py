import requests
import logging
from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth import login as auth_login
from django.contrib.auth.models import User
from django.core.signing import TimestampSigner, BadSignature, SignatureExpired
from django.http import JsonResponse
from django.urls import reverse
from django.conf import settings
from core.models import SystemSettings

logger = logging.getLogger(__name__)

# Signer instance with a dedicated salt
signer = TimestampSigner(salt='whatsapp-magic-link')

def send_whatsapp_login_link(request):
    """
    Generate a magic link and send it via WhatsApp API.
    """
    if request.method != 'POST':
        return JsonResponse({'success': False, 'message': 'Method not allowed'}, status=405)

    phone = request.POST.get('phone')
    next_url = request.POST.get('next', '/')

    if not phone:
        return JsonResponse({'success': False, 'message': 'رقم الهاتف مطلوب'}, status=400)

    # Clean phone number (assuming username is the phone number)
    username = phone.strip()
    user = User.objects.filter(username=username).first()

    if not user:
        return JsonResponse({'success': False, 'message': 'رقم الهاتف غير مسجل'}, status=404)

    # Generate secure token (valid for 10 minutes)
    token = signer.sign(username)
    
    # Build magic link
    relative_link = reverse('verify_whatsapp_login')
    # Inclusion of next_url in the magic link
    magic_link = request.build_absolute_uri(f"{relative_link}?token={token}&next={next_url}")

    # Fetch WhatsApp API settings
    system_settings = SystemSettings.objects.first()
    if not system_settings or not system_settings.whatsapp_api_url or not system_settings.whatsapp_api_key:
        return JsonResponse({'success': False, 'message': 'إعدادات خدمة WhatsApp غير مكتملة'}, status=500)

    # Message content
    message = f"مرحباً {user.first_name or user.username}،\n\nاستخدم الرابط التالي لتسجيل الدخول إلى حسابك:\n{magic_link}\n\nهذا الرابط صالح لمدة 10 دقائق."

    try:
        response = requests.post(
            system_settings.whatsapp_api_url,
            headers={
                'X-API-Key': system_settings.whatsapp_api_key,
                'Content-Type': 'application/json'
            },
            json={
                'phone': username,
                'message': message
            },
            timeout=10
        )
        
        if response.status_code == 200:
            return JsonResponse({'success': True, 'message': 'تم إرسال رابط تسجيل الدخول إلى WhatsApp الخاص بك'})
        else:
            logger.error(f"WhatsApp API Error: {response.status_code} - {response.text}")
            return JsonResponse({'success': False, 'message': 'حدث خطأ أثناء إرسال الرسالة، يرجى المحاولة لاحقاً'}, status=500)

    except Exception as e:
        logger.exception("WhatsApp Connection Error")
        return JsonResponse({'success': False, 'message': 'حدث خطأ في الاتصال بخدمة WhatsApp، يرجى المحاولة لاحقاً'}, status=500)

def verify_whatsapp_login(request):
    """
    Verify the token from the magic link and log the user in.
    """
    token = request.GET.get('token')
    next_url = request.GET.get('next', '/')

    if not token:
        return render(request, 'login_error.html', {'message': 'رابط غير صالح'})

    try:
        # Validate token (max_age is 600 seconds = 10 minutes)
        username = signer.unsign(token, max_age=600)
        user = User.objects.filter(username=username).first()

        if user:
            auth_login(request, user)
            return redirect(next_url)
        else:
            return render(request, 'login_error.html', {'message': 'المستخدم غير موجود'})

    except SignatureExpired:
        return render(request, 'login_error.html', {'message': 'رابط تسجيل الدخول انتهت صلاحيته'})
    except BadSignature:
        return render(request, 'login_error.html', {'message': 'رابط تسجيل دخول غير صالح'})
