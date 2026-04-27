from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Thread, Message

class UserChatSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name']

class MessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.ReadOnlyField(source='sender.username')
    
    class Meta:
        model = Message
        fields = ['id', 'thread', 'sender', 'sender_name', 'guest_id', 'text', 'is_read', 'created_at']

class ThreadSerializer(serializers.ModelSerializer):
    customer_details = UserChatSerializer(source='customer', read_only=True)
    supplier_name = serializers.ReadOnlyField(source='supplier.name')
    other_party_name = serializers.SerializerMethodField()
    other_party_avatar = serializers.SerializerMethodField()
    primary_color = serializers.ReadOnlyField(source='supplier.primary_color')
    secondary_color = serializers.ReadOnlyField(source='supplier.secondary_color')
    last_message = serializers.SerializerMethodField()
    
    class Meta:
        model = Thread
        fields = [
            'id', 'customer', 'customer_details', 'guest_id', 
            'supplier', 'supplier_name', 'primary_color', 'secondary_color',
            'other_party_name', 'other_party_avatar', 'updated_at', 'last_message'
        ]


    def get_other_party_name(self, obj):
        request = self.context.get('request')
        if not request: return obj.supplier.name
        
        user = request.user
        # If viewing as Supplier Manager, show Customer info
        if user.is_authenticated and obj.supplier.managing_users.filter(id=user.id).exists():
            if obj.customer:
                name = f"{obj.customer.first_name} {obj.customer.last_name}".strip()
                return name if name else obj.customer.username
            return f"Guest {obj.guest_id[:8]}" if obj.guest_id else "Guest"
        
        # If viewing as Customer (Auth or Guest), show Supplier info
        return obj.supplier.name

    def get_other_party_avatar(self, obj):
        request = self.context.get('request')
        if not request: return None
        
        user = request.user
        # If viewing as Supplier Manager, return customer avatar (placeholder for now)
        if user.is_authenticated and obj.supplier.managing_users.filter(id=user.id).exists():
            return None 
            
        # If viewing as Customer, return supplier logo
        if obj.supplier.profile_picture:
            return obj.supplier.profile_picture.url
        return None

    def get_last_message(self, obj):
        msg = obj.messages.last()
        if msg:
            return MessageSerializer(msg).data
        return None

