import logging
from django.db.models.signals import post_save
from django.dispatch import receiver
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.utils import timezone
from .models import Notification, PublicAnnouncement
from .serializers import NotificationSerializer
from .tasks import send_push_notification_task, broadcast_push_notification_task

logger = logging.getLogger(__name__)

@receiver(post_save, sender=Notification)
def send_notification_on_save(sender, instance, created, **kwargs):
    # Send if it's new OR if it's an update to an unread notification (e.g. new chat message)
    if created or not instance.is_read:
        logger.info(f"DEBUG: Notification signal fired for {instance.user.username}. Created: {created}, Unread: {not instance.is_read}")
        channel_layer = get_channel_layer()
        serializer = NotificationSerializer(instance)
        group_name = f'user_notifications_{instance.user.id}'
        
        async_to_sync(channel_layer.group_send)(
            group_name,
            {
                'type': 'notification_message',
                'notification': serializer.data
            }
        )

        # Get absolute image URL if exists
        image_url = None
        if instance.image:
            image_url = instance.image.url
            if not image_url.startswith('http'):
                image_url = f"http://192.168.8.125:8000{image_url}"

        # Send Push Notification in background (Celery)
        tokens = list(instance.user.push_tokens.values_list('token', flat=True))
        logger.info(f"DEBUG: Found {len(tokens)} push tokens for user {instance.user.username}")
        
        if tokens:
            logger.info(f"DEBUG: Queuing push task for {instance.user.username}")
            send_push_notification_task.delay(
                tokens=tokens,
                title=instance.title,
                message=instance.message,
                data=serializer.data,
                image_url=image_url
            )


@receiver(post_save, sender=PublicAnnouncement)
def trigger_public_broadcast(sender, instance, created, **kwargs):
    """
    Automatically triggers a public broadcast when a new announcement is created.
    """
    if created and not instance.is_sent:
        image_url = None
        if instance.image:
            image_url = instance.image.url
            if not image_url.startswith('http'):
                image_url = f"http://192.168.8.125:8000{image_url}"

        broadcast_push_notification_task.delay(
            title=instance.title,
            message=instance.message,
            image_url=image_url
        )
        # Update status
        PublicAnnouncement.objects.filter(pk=instance.pk).update(
            is_sent=True,
            sent_at=timezone.now()
        )



# Notify merchant managers when a new order is created
def notify_merchant_new_order(sender, instance, created, **kwargs):
    if created:
        from .utils import send_merchant_notification
        supplier = instance.get_supplier()
        if supplier:
            send_merchant_notification(
                merchant=supplier,
                title="طلب جديد",
                message=f"لقد تم استلام طلب جديد برقم #{instance.id}",
                notification_type='order'
            )

# We connect this in ready() of apps.py to avoid early imports

