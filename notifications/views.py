from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from .models import Notification
from .serializers import NotificationSerializer

class NotificationViewSet(viewsets.ModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user)

    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        notification = self.get_object()
        notification.is_read = True
        notification.read_at = timezone.now()
        notification.save()
        return Response({'status': 'marked as read'})

    @action(detail=False, methods=['post'])
    def mark_all_read(self, request):
        self.get_queryset().filter(is_read=False).update(
            is_read=True, 
            read_at=timezone.now()
        )
        return Response({'status': 'all marked as read'})

    @action(detail=False, methods=['post'])
    def register_push_token(self, request):
        from .models import DevicePushToken
        token = request.data.get('token')
        device_name = request.data.get('device_name')
        
        if not token:
            return Response({'error': 'Token is required'}, status=status.HTTP_400_BAD_REQUEST)
            
        DevicePushToken.objects.update_or_create(
            token=token,
            defaults={
                'user': request.user,
                'device_name': device_name
            }
        )
        return Response({'status': 'token registered'})

