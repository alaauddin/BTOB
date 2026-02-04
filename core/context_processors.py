from django.db import ProgrammingError
from .models import SystemSettings

def system_settings(request):
    """
    Context processor to make system settings available in all templates.
    """
    settings = None
    try:
        # Check if we are in a tenant context (and not public)
        # SystemSettings is a tenant-specific model.
        if hasattr(request, 'tenant') and request.tenant.schema_name != 'public':
            settings = SystemSettings.objects.first()
        else:
            settings = None
    except (ProgrammingError, Exception):
        settings = None
        
    return {
        'system_settings': settings,
        'css_version': '4.7.6'  
    }
