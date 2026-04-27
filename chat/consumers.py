import json
import logging

from urllib.parse import parse_qs
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth.models import User
from .models import Thread, Message
from .serializers import MessageSerializer

logger = logging.getLogger(__name__)

class ChatConsumer(AsyncWebsocketConsumer):

    async def connect(self):
        self.thread_id = self.scope['url_route']['kwargs']['thread_id']
        self.room_group_name = f'chat_{self.thread_id}'
        self.user = self.scope.get('user')
        
        # Determine if guest
        query_string = self.scope.get('query_string', b'').decode('utf-8')
        query_params = parse_qs(query_string)
        self.guest_id = query_params.get('guest_id', [None])[0]

        # VERIFY ACCESS
        if not await self.check_access():
            await self.close()
            return

        # Join room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        await self.accept()


    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    async def receive(self, text_data):
        data = json.loads(text_data)
        message_text = data['message']

        # Save to DB
        message = await self.save_message(message_text)

        # Broadcast
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'chat_message',
                'message': {
                    'id': message.id,
                    'text': message.text,
                    'sender': message.sender.id if message.sender else None,
                    'guest_id': message.guest_id,
                    'created_at': message.created_at.isoformat()
                }
            }
        )

    async def chat_message(self, event):
        await self.send(text_data=json.dumps({
            'type': 'message',
            'message': event['message']
        }))


    @database_sync_to_async
    def check_access(self):
        try:
            thread = Thread.objects.get(id=self.thread_id)
            logger.info(f"Checking access for Thread {self.thread_id}. User: {self.user}, Authenticated: {self.user.is_authenticated if self.user else False}, Guest: {self.guest_id}")
            
            # 1. If guest_id matches, allow access (even if authenticated)
            # This handles users who started as guests and then logged in
            if self.guest_id and thread.guest_id == self.guest_id:
                logger.info(f"Access granted: Valid guest_id {self.guest_id}")
                return True

            # 2. If authenticated, check if customer, manager, or superuser
            if self.user and self.user.is_authenticated:
                if self.user.is_superuser:
                    logger.info(f"Access granted: User {self.user} is a superuser.")
                    return True

                if thread.customer == self.user:
                    logger.info("Access granted: User is the customer.")
                    return True
                
                is_manager = thread.supplier.managing_users.filter(id=self.user.id).exists()
                if is_manager:
                    logger.info("Access granted: User is a supplier manager.")
                    return True
                
                logger.warning(f"Access denied: User {self.user} is not the customer or manager for thread {self.thread_id}")
                return False
                
            logger.warning(f"Access denied: No valid credentials for thread {self.thread_id}")
            return False

        except Thread.DoesNotExist:
            logger.error(f"Access denied: Thread {self.thread_id} does not exist.")
            return False
        except Exception as e:
            logger.error(f"Error in check_access: {str(e)}")
            return False


    @database_sync_to_async
    def save_message(self, text):

        from .models import Thread, Message
        thread = Thread.objects.get(id=self.thread_id)
        
        sender = self.user if self.user and self.user.is_authenticated else None
        guest_id = self.guest_id if not sender else None
        
        message = Message.objects.create(
            thread=thread,
            sender=sender,
            guest_id=guest_id,
            text=text
        )
        # Update thread timestamp
        thread.save()
        return message

