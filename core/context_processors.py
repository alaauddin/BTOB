from .models import SystemSettings

def system_settings(request):
    """
    Context processor to make system settings available in all templates.
    """
    try:
        settings = SystemSettings.objects.first()
    except Exception:
        settings = None
        
    return {
        'system_settings': settings,
        'css_version': '4.2.8'  # Update this to bust cache
    }
