from tenants.models import Client, Domain
from django.db import transaction

# Create Public Tenant
# The public tenant is required for django-tenants to work effectively for the shared schema
try:
    with transaction.atomic():
        if not Client.objects.filter(schema_name='public').exists():
            public_client = Client(schema_name='public', name='Public Tenant')
            public_client.save()
            print("Created Public Tenant")
            
            # Domain for public tenant
            # Ensure this matches the accessing domain (localhost for dev)
            domain = Domain()
            domain.domain = 'localhost' # or 127.0.0.1
            domain.tenant = public_client
            domain.is_primary = True
            domain.save()
            print("Created Public Domain 'localhost'")
        else:
            print("Public Tenant already exists")
            
except Exception as e:
    print(f"Error creating public tenant: {e}")
