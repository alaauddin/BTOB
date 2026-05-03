from rest_framework import serializers
from .models import Notification

class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = [
            'id', 'user', 'title', 'message', 'notification_type', 
            'image', 'content_type', 'object_id', 'is_read', 'read_at', 'created_at'
        ]
        read_only_fields = ['id', 'user', 'created_at']
