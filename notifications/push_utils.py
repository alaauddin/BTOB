import requests
import json
import logging

logger = logging.getLogger(__name__)

def send_expo_push_notification(tokens, title, message, data=None, image_url=None):
    """
    Sends a push notification using Expo's Push API.
    """
    if not tokens:
        return
    
    url = "https://exp.host/--/api/v2/push/send"
    
    # Expo expects a list of notification objects
    messages = []
    for token in tokens:
        if not token.startswith("ExponentPushToken"):
            continue
            
        payload = {
            "to": token,
            "title": title,
            "body": message,
            "sound": "default",
            "priority": "high",
            "channelId": "default",
            "data": data or {}
        }

        if image_url:
            # iOS: Requires mutableContent and attachments
            payload["mutableContent"] = True
            payload["attachments"] = [{"url": image_url}]
            
            # Android: Expo maps top-level data fields to FCM
            # Some Android versions also look for 'image' in the data payload
            payload["data"]["image"] = image_url
            
            # Newer Expo versions support this top-level field for some providers
            # but usually 'data' is the safest bet for Android

        messages.append(payload)

    
    if not messages:
        return

    try:
        response = requests.post(
            url,
            headers={
                "Accept": "application/json",
                "Accept-encoding": "gzip, deflate",
                "Content-Type": "application/json",
            },
            data=json.dumps(messages),
            timeout=10
        )
        response_data = response.json()
        logger.info(f"Expo push response: {json.dumps(response_data)}")
        
        # Check for errors in individual messages
        if 'data' in response_data:
            for i, result in enumerate(response_data['data']):
                if result.get('status') == 'error':
                    logger.error(f"Push error for token {messages[i]['to']}: {result.get('message')}")
        
        return response_data
    except Exception as e:
        logger.error(f"Error sending push notification: {str(e)}")
        return None

def broadcast_public_notification(title, message, data=None, image_url=None):
    """
    Sends a push notification to EVERY registered device in the database.
    """
    from .models import DevicePushToken
    # Get all unique tokens
    tokens = list(DevicePushToken.objects.values_list('token', flat=True).distinct())
    
    if not tokens:
        logger.info("No tokens found for public broadcast")
        return None

    logger.info(f"Broadcasting public notification to {len(tokens)} devices")
    
    # Expo recommends batching tokens (max 100 per request for optimal performance)
    results = []
    for i in range(0, len(tokens), 100):
        batch = tokens[i:i + 100]
        result = send_expo_push_notification(batch, title, message, data, image_url)
        results.append(result)

    
    return results
