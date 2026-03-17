import logging

from core.models import SystemSettings

logger = logging.getLogger(__name__)


def send_whatsapp_message(phone: str, message: str) -> bool:
    """Send a WhatsApp message asynchronously via Celery."""
    # Import here to avoid circular imports
    from core.tasks import send_whatsapp_message_task
    
    settings = SystemSettings.objects.first()
    if not settings or not settings.whatsapp_api_url or not settings.whatsapp_api_key:
        logger.error("WhatsApp API settings are incomplete.")
        return False

    # Normalise phone number (add Yemen country code 967 if missing)
    phone = str(phone).strip()
    if phone.startswith("0"):
        phone = "967" + phone[1:]
    elif not phone.startswith("+") and not phone.startswith("967") and len(phone) == 9:
        phone = "967" + phone

    # skip not yemeni number
    normalized = phone.lstrip("+")
    if not normalized.startswith("967") or len(normalized) != 12:
        logger.warning(f"WhatsApp: skipping non-Yemeni or invalid number '{phone}'.")
        return False

    # Queue the task
    send_whatsapp_message_task.delay(
        phone, 
        str(message), 
        settings.whatsapp_api_url, 
        settings.whatsapp_api_key
    )
    return True
