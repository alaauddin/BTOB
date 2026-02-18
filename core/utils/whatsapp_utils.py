import requests
import logging
import threading
from core.models import SystemSettings

logger = logging.getLogger(__name__)

def _send_whatsapp_message_sync(phone, message):
    """
    Internal synchronous function to send a WhatsApp message.
    """
    system_settings = SystemSettings.objects.first()
    if not system_settings or not system_settings.whatsapp_api_url or not system_settings.whatsapp_api_key:
        logger.error("WhatsApp API settings are incomplete.")
        return False

    # Ensure phone number is a string and clean it if necessary
    phone = str(phone).strip()
    if phone.startswith('0'):
        phone = '967' + phone[1:]  # Assuming Yemen if it starts with 0
    elif not phone.startswith('+') and not phone.startswith('967'):
        # If no country code, prepend 967 as default for this platform
        if len(phone) == 9:  # standard yemen mobile without 0
             phone = '967' + phone

    try:
        response = requests.post(
            system_settings.whatsapp_api_url,
            headers={
                'X-API-Key': system_settings.whatsapp_api_key,
                'Content-Type': 'application/json'
            },
            json={
                'phone': phone,
                'message': message
            },
            timeout=20,
            verify=False
        )
        
        if response.status_code == 200:
            logger.info(f"WhatsApp message sent to {phone}")
            return True
        else:
            logger.error(f"WhatsApp API Error: {response.status_code} - {response.text}")
            return False

    except Exception as e:
        logger.exception(f"WhatsApp Connection Error: {str(e)}")
        return False

def send_whatsapp_message(phone, message):
    """
    Asynchronously send a WhatsApp message using a background thread.
    """
    thread = threading.Thread(target=_send_whatsapp_message_sync, args=(phone, message))
    thread.daemon = True
    thread.start()
    return True # Return true immediately as it's running in background
