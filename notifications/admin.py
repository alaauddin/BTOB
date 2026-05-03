from django.contrib import admin
from django.utils import timezone
from .models import Notification, PublicAnnouncement, DevicePushToken

@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ('user', 'title', 'notification_type', 'is_read', 'created_at')
    list_filter = ('notification_type', 'is_read', 'created_at')
    search_fields = ('user__username', 'title', 'message')
    readonly_fields = ('created_at',)

@admin.register(PublicAnnouncement)
class PublicAnnouncementAdmin(admin.ModelAdmin):
    list_display = ('title', 'is_sent', 'sent_at', 'created_at')
    readonly_fields = ('created_at', 'sent_at', 'is_sent')
    actions = ['send_broadcast']

    def send_broadcast(self, request, queryset):
        from .tasks import broadcast_push_notification_task
        for announcement in queryset:
            broadcast_push_notification_task.delay(
                title=announcement.title,
                message=announcement.message
            )
            announcement.is_sent = True
            announcement.sent_at = timezone.now()
            announcement.save()
        
        self.message_user(request, f"Broadcast queued for {queryset.count()} announcements.")
    
    send_broadcast.short_description = "Send selected announcements to ALL users"

@admin.register(DevicePushToken)
class DevicePushTokenAdmin(admin.ModelAdmin):
    list_display = ('user', 'device_name', 'token', 'created_at')
    search_fields = ('user__username', 'token', 'device_name')
