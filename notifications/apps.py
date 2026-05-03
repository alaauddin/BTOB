from django.apps import AppConfig

class NotificationsConfig(AppConfig):
    default_auto_field = 'django.db.models.AutoField'
    name = 'notifications'

    def ready(self):
        import notifications.signals
        from django.db.models.signals import post_save
        from core.models import Order
        post_save.connect(notifications.signals.notify_merchant_new_order, sender=Order)
