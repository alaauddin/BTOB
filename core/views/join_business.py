from django.shortcuts import render, redirect
from django.contrib import messages
from core.forms import BusinessRequestForm
from core.models import SystemSettings
from core.utils.whatsapp_utils import send_whatsapp_message

def join_business(request):
    if request.method == 'POST':
        form = BusinessRequestForm(request.POST)
        if form.is_valid():
            business_request = form.save()
            
            # Send WhatsApp Notification to Admin
            try:
                settings = SystemSettings.objects.first()
                if settings and settings.whatsapp_number:
                    # Construct Message
                    msg = (
                        f"*طلب انضمام نشاط تجاري جديد*\n\n"
                        f"*اسم النشاط:* {business_request.name}\n"
                        f"*اسم المالك:* {business_request.owner_name}\n"
                        f"*رقم الهاتف:* {business_request.phone}\n"
                        f"*البريد الإلكتروني:* {business_request.email}\n"
                        f"*نوع النشاط:* {business_request.business_type}\n"
                        f"*الرسالة:* {business_request.message}\n"
                    )
                    send_whatsapp_message(settings.whatsapp_number, msg)
            except Exception as e:
                # Log error silently or just pass, don't block user flow
                print(f"Error sending WhatsApp notification to admin: {e}")

            # Send Welcoming WhatsApp Message to User
            try:
                user_phone = business_request.phone
                # Convert Yemeni local number to international format if needed
                if not user_phone.startswith('+'):
                    user_phone = f"+967{user_phone}"
                
                welcome_msg = (
                    f"أهلاً بك يا *{business_request.owner_name}* في عائلة عرطات! 🌟\n\n"
                    f"لقد استلمنا طلب انضمام نشاطك التجاري *({business_request.name})* بنجاح.\n\n"
                    f"🔹 *رقم طلبك:* #{business_request.id:04d}\n"
                    f"🔹 *الحالة:* قيد المراجعة\n\n"
                    f"سيقوم فريقنا بمراجعة طلبك والتواصل معك قريباً جداً لتكملة بقية الإجراءات. نحن متحمسون جداً للعمل معك! 🚀\n\n"
                    f"شكراً لثقتك بنا."
                )
                send_whatsapp_message(user_phone, welcome_msg)
            except Exception as e:
                print(f"Error sending welcome WhatsApp notification: {e}")

            messages.success(request, f'تم إرسال طلبك بنجاح! رقم طلبك هو #{business_request.id:04d}. سنتواصل معك قريباً.')
            return redirect('join_business')
    else:
        form = BusinessRequestForm()
    
    return render(request, 'join_business.html', {'business_form': form})
