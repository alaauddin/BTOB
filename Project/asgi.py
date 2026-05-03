import os
import django

# IMPORTANT: setup Django BEFORE importing any Django models/apps/middleware.
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Project.settings')
django.setup()

from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from chat.middleware import JWTAuthMiddleware

from channels.security.websocket import AllowedHostsOriginValidator
from chat.routing import websocket_urlpatterns as chat_urlpatterns
from notifications.routing import websocket_urlpatterns as notification_urlpatterns

websocket_urlpatterns = chat_urlpatterns + notification_urlpatterns

application = ProtocolTypeRouter({
    "http": get_asgi_application(),
    "websocket": AllowedHostsOriginValidator(
        AuthMiddlewareStack(
            JWTAuthMiddleware(
                URLRouter(
                    websocket_urlpatterns
                )
            )
        )
    ),
})



