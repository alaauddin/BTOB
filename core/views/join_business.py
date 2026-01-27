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
                print(f"Error sending WhatsApp notification: {e}")

            messages.success(request, 'تم إرسال طلبك بنجاح! سنتواصل معك قريباً.')
            return redirect('join_business')
    else:
        form = BusinessRequestForm()
    
    return render(request, 'join_business.html', {'business_form': form})
