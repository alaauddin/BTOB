from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q
from .models import Thread, Message
from .serializers import ThreadSerializer, MessageSerializer

from core.utils.merchant_utils import get_active_supplier

class ChatViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.AllowAny]
    serializer_class = ThreadSerializer

    def get_queryset(self):
        user = self.request.user
        guest_id = self.request.query_params.get('guest_id')
        
        if user.is_authenticated:
            # 1. Always include chats where the user is the customer
            customer_q = Q(customer=user)
            
            # 2. If acting as a merchant, only show chats for the ACTIVE supplier
            active_supplier = get_active_supplier(self.request)
            if active_supplier:
                # User is in merchant mode for a specific supplier
                merchant_q = Q(supplier=active_supplier)
                return Thread.objects.filter(customer_q | merchant_q).distinct()
            
            # Fallback: if no active supplier (e.g. pure customer), show all customer threads
            return Thread.objects.filter(customer_q).distinct()
            
        elif guest_id:

            # Guests see threads associated with their guest_id
            return Thread.objects.filter(guest_id=guest_id)
        return Thread.objects.none()

    @action(detail=True, methods=['get'])
    def messages(self, request, pk=None):
        thread = self.get_object()
        
        # Verify access for guests
        guest_id = request.query_params.get('guest_id')
        if not request.user.is_authenticated and thread.guest_id != guest_id:
            return Response({'error': 'Unauthorized'}, status=status.HTTP_401_UNAUTHORIZED)
            
        messages = thread.messages.all()
        
        # Mark as read (if sender is not current user/guest)
        if request.user.is_authenticated:
            messages.filter(~Q(sender=request.user)).update(is_read=True)
        elif guest_id:
            messages.filter(sender__isnull=False).update(is_read=True)
        
        serializer = MessageSerializer(messages, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def start(self, request):
        supplier_id = request.data.get('supplier_id')
        guest_id = request.data.get('guest_id')
        
        if not supplier_id:
            return Response({'error': 'supplier_id is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        if request.user.is_authenticated:
            # Check if there's a guest thread that should be linked to this user
            if guest_id:
                guest_thread = Thread.objects.filter(
                    guest_id=guest_id, 
                    supplier_id=supplier_id, 
                    customer__isnull=True
                ).first()
                if guest_thread:
                    guest_thread.customer = request.user
                    guest_thread.save()
                    return Response(ThreadSerializer(guest_thread).data)

            thread, created = Thread.objects.get_or_create(
                customer=request.user,
                supplier_id=supplier_id
            )
        elif guest_id:
            thread, created = Thread.objects.get_or_create(
                guest_id=guest_id,
                supplier_id=supplier_id,
                customer__isnull=True
            )
        else:
            return Response({'error': 'Authentication or guest_id required'}, status=status.HTTP_400_BAD_REQUEST)

        serializer = ThreadSerializer(thread, context={'request': request})
        return Response(serializer.data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


