import requests
import logging
import threading

from django.db import connection
from core.models import SystemSettings

logger = logging.getLogger(__name__)


def _do_send(phone: str, message: str, api_url: str, api_key: str) -> None:
    """Background thread: send a WhatsApp message."""
    connection.close()  # avoid inheriting the parent thread's DB connection
    try:
        r = requests.post(
                api_url,
                headers={"X-API-Key": api_key, "Content-Type": "application/json"},
                json={"phone": phone, "message": message},
                timeout=20,
                verify=True,
            )
        if r.status_code == 200:
            logger.info(f"WhatsApp sent to {phone}")
            return
        logger.warning(f"WhatsApp attempt failed: {r.status_code} - {r.text}")
    except Exception as exc:
        logger.warning(f"WhatsApp error: {exc}")


def send_whatsapp_message(phone: str, message: str) -> bool:
    """Send a WhatsApp message asynchronously in a background thread."""
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
    if not phone.startswith("967") or len(phone) != 12:
        logger.warning(f"WhatsApp attempt failed: {phone} is not a Yemeni number.")
        return False
    threading.Thread(
        target=_do_send,
        args=(phone, str(message), settings.whatsapp_api_url, settings.whatsapp_api_key),
        daemon=True,
    ).start()
    return True
