from .models import Notification

def send_merchant_notification(merchant, title, message, notification_type='info', **kwargs):
    """
    Sends a notification to all users managing a specific merchant (supplier).
    """
    # 1. Get the primary user (the owner)
    users = set()
    if merchant.user:
        users.add(merchant.user)
    
    # 2. Get all managing users
    for user in merchant.managing_users.all():
        users.add(user)
    
    # 3. Create a notification for each user
    created_notifications = []
    for user in users:
        notification = Notification.objects.create(
            user=user,
            title=title,
            message=message,
            notification_type=notification_type,
            content_type='merchant',
            object_id=str(merchant.id),
            **kwargs
        )
        created_notifications.append(notification)
    
    return created_notifications
