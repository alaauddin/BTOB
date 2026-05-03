from celery import shared_task
from .push_utils import send_expo_push_notification
import logging

logger = logging.getLogger(__name__)

@shared_task
def send_push_notification_task(tokens, title, message, data=None, image_url=None):
    """
    Celery task to send push notifications in the background.
    """
    logger.info(f"Sending push notification to {len(tokens)} tokens")
    return send_expo_push_notification(tokens, title, message, data, image_url)

@shared_task
def broadcast_push_notification_task(title, message, data=None, image_url=None):
    """
    Celery task to broadcast a public notification to all users.
    """
    from .push_utils import broadcast_public_notification
    return broadcast_public_notification(title, message, data, image_url)


