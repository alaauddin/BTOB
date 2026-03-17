import requests
import logging
from celery import shared_task
from django.db import connection
from core.models import SystemSettings

logger = logging.getLogger(__name__)

@shared_task(bind=True, max_retries=3)
def send_whatsapp_message_task(self, phone: str, message: str, api_url: str, api_key: str):
    """Celery task to send a WhatsApp message."""
    # Note: DB connection handling is usually managed by Celery's worker process
    try:
        r = requests.post(
            api_url,
            headers={"X-API-Key": api_key, "Content-Type": "application/json"},
            json={"phone": phone, "message": message},
            timeout=20,
            verify=False,
        )
        if r.status_code == 200:
            logger.info(f"WhatsApp sent to {phone}")
            return True
        else:
            logger.warning(f"WhatsApp attempt failed: {r.status_code} - {r.text}")
            # Retry if it's a transient error
            if 500 <= r.status_code < 600:
                raise self.retry(exc=Exception(f"API Error: {r.status_code}"), countdown=5)
            return False
    except Exception as exc:
        logger.error(f"WhatsApp error for {phone}: {exc}")
        if not isinstance(exc, self.Retry):
             raise self.retry(exc=exc, countdown=5)
        raise exc
