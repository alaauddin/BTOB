import logging
from django.utils import timezone
from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Message

logger = logging.getLogger(__name__)

@receiver(post_save, sender=Message)
def send_chat_notification(sender, instance, created, **kwargs):
    """
    Trigger a notification when a new chat message is created.
    """
    from notifications.models import Notification
    
    if created:
        thread = instance.thread
        sender_user = instance.sender
        logger.info(f"DEBUG: Chat signal fired. Sender: {sender_user}, Thread ID: {thread.id}, Thread Customer: {thread.customer}, Thread Supplier: {thread.supplier.name}")
        
        # Determine recipient(s)
        recipients = []
        
        # 1. SENDER IS CUSTOMER -> NOTIFY SUPPLIER
        if sender_user and thread.customer and sender_user.id == thread.customer.id:
            recipients = list(thread.supplier.managing_users.all())
            if thread.supplier.user and thread.supplier.user not in recipients:
                recipients.append(thread.supplier.user)
            logger.info(f"DEBUG: Sender is Customer. Found {len(recipients)} supplier managers to notify.")
        
        # 2. SENDER IS SUPPLIER MANAGER -> NOTIFY CUSTOMER
        elif sender_user:
            # Check if sender is a manager of this supplier
            is_manager = thread.supplier.managing_users.filter(id=sender_user.id).exists()
            is_owner = thread.supplier.user and sender_user.id == thread.supplier.user.id
            
            if (is_manager or is_owner) and thread.customer:
                recipients = [thread.customer]
                logger.info("DEBUG: Sender is Supplier/Manager. Notifying Customer.")
            else:
                logger.warning(f"DEBUG: Sender {sender_user} is neither Customer nor Supplier Manager for this thread.")
        
        # 3. SENDER IS GUEST -> NOTIFY SUPPLIER
        elif instance.guest_id:
             recipients = list(thread.supplier.managing_users.all())
             if thread.supplier.user and thread.supplier.user not in recipients:
                recipients.append(thread.supplier.user)
             logger.info(f"DEBUG: Sender is Guest. Notifying {len(recipients)} supplier users.")

        # Create or Update notifications for all recipients
        for recipient in recipients:
            if recipient == sender_user:
                continue
            
            logger.info(f"DEBUG: Handling notification for user {recipient.username}")
            
            # Check for existing UNREAD notification for this specific chat thread
            notification = Notification.objects.filter(
                user=recipient,
                notification_type='chat',
                content_type='chat.thread',
                object_id=str(thread.id),
                is_read=False
            ).first()

            if notification:
                logger.info(f"DEBUG: Found existing unread notification for thread {thread.id}. Updating it.")
                notification.message = instance.text[:100] + ('...' if len(instance.text) > 100 else '')
                notification.created_at = timezone.now() # Refresh the timestamp
                notification.save()
            else:
                logger.info(f"DEBUG: No unread notification found for thread {thread.id}. Creating new one.")
                Notification.objects.create(
                    user=recipient,
                    title=f"New message from {sender_user.username if sender_user else 'Guest'}",
                    message=instance.text[:100] + ('...' if len(instance.text) > 100 else ''),
                    notification_type='chat',
                    content_type='chat.thread',
                    object_id=str(thread.id)
                )
