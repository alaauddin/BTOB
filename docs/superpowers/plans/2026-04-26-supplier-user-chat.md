# Supplier-User Chat System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a real-time messaging system between Customers and Suppliers using Django Channels (WebSockets) and React Native.

**Architecture:** 
- **Backend:** Django Channels with Redis as the channel layer. JWT-based authentication for WebSocket connections.
- **Frontend:** React Native with a custom `useChat` hook for WebSocket lifecycle management.
- **Models:** `Thread` (Conversation) and `Message`.

**Tech Stack:** Django, Django Channels, Redis, DRF, React Native, Expo.

---

### Task 1: Backend Infrastructure (Channels & Redis)

**Files:**
- Modify: `requirements.txt`
- Modify: `Project/settings.py`
- Create: `Project/asgi.py`
- Modify: `docker-compose.yml`

- [ ] **Step 1: Add dependencies to requirements.txt**
Add `channels==4.0.0` and `channels-redis==4.2.0`.

- [ ] **Step 2: Create Project/asgi.py**
```python
import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Project.settings')

application = ProtocolTypeRouter({
    "http": get_asgi_application(),
    "websocket": AuthMiddlewareStack(
        URLRouter([
            # Will add chat routing here
        ])
    ),
})
```

- [ ] **Step 2.1: Run: `pip install channels channels-redis`**

- [ ] **Step 3: Update Project/settings.py**
Set `ASGI_APPLICATION = 'Project.asgi.application'`.
Add `'channels'` to `INSTALLED_APPS`.
Configure `CHANNEL_LAYERS` with Redis.

- [ ] **Step 4: Update docker-compose.yml**
Ensure a Redis service is running and accessible to the Django container.

---

### Task 2: Chat Data Models

**Files:**
- Create: `chat/models.py`
- Create: `chat/serializers.py`
- Modify: `Project/settings.py`

- [ ] **Step 1: Define Thread and Message models**
```python
# chat/models.py
from django.db import models
from django.contrib.auth.models import User

class Thread(models.Model):
    customer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='customer_threads')
    supplier = models.ForeignKey('core.Supplier', on_delete=models.CASCADE, related_name='threads')
    updated_at = models.DateTimeField(auto_now=True)

class Message(models.Model):
    thread = models.ForeignKey(Thread, on_delete=models.CASCADE, related_name='messages')
    sender = models.ForeignKey(User, on_delete=models.CASCADE)
    text = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
```

- [ ] **Step 2: Create Serializers**
Implement `ThreadSerializer` and `MessageSerializer` for API access.

- [ ] **Step 3: Run Migrations**
Run: `python manage.py makemigrations chat && python manage.py migrate`

---

### Task 3: WebSocket Consumer & Routing

**Files:**
- Create: `chat/consumers.py`
- Create: `chat/routing.py`
- Modify: `Project/asgi.py`

- [ ] **Step 1: Implement ChatConsumer**
Handle `connect`, `disconnect`, and `receive` (for sending messages).
Implement `chat_message` group handler.

- [ ] **Step 2: Define WebSocket Routing**
Map `ws/chat/<thread_id>/` to `ChatConsumer`.

---

### Task 4: Mobile App Chat Hook

**Files:**
- Create: `btob-mobile/src/context/ChatContext.js`
- Create: `btob-mobile/src/api/chat.js`

- [ ] **Step 1: Create useChat Hook**
Manage `WebSocket` instance, handling message reception and state updates.
Implement auto-reconnect logic.

---

### Task 5: Mobile UI (Screens)

**Files:**
- Create: `btob-mobile/src/screens/ChatListScreen.js`
- Create: `btob-mobile/src/screens/ChatScreen.js`

- [ ] **Step 1: Build ChatListScreen**
List all threads with last message preview and unread counts.

- [ ] **Step 2: Build ChatScreen**
Premium chat interface with message bubbles, status indicators, and RTL support.

---

### Task 6: Verification & Testing

- [ ] **Step 1: Verify real-time delivery**
Open two sessions (Supplier and Customer) and verify messages appear instantly without refresh.

- [ ] **Step 2: Verify offline message persistence**
Send a message when one party is offline, and verify it appears when they reconnect.
