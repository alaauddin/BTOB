import os
import django

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Project.settings')
django.setup()

from django.contrib.sites.models import Site
from allauth.socialaccount.models import SocialApp

def setup_production():
    DOMAIN = 'aratatt.com'
    NAME = 'Aratatt'
    
    # Request credentials from user to avoid hardcoding secrets in git
    print("--- Production OAuth Setup ---")
    CLIENT_ID = input("Enter Google Client ID: ").strip()
    SECRET = input("Enter Google Client Secret: ").strip()

    if not CLIENT_ID or not SECRET:
        print("[ERROR] Client ID and Secret are required.")
        return
    # 1. Update or create the Site
    # Usually Site ID 1 exists, we just update it
    site, created = Site.objects.get_or_create(id=1)
    site.domain = DOMAIN
    site.name = NAME
    site.save()
    print(f"Site configured (ID: {site.id}, Domain: {site.domain})")

    print(f"\n--- Configuring Google SocialApp ---")
    # 2. Update or create the SocialApp
    app, created = SocialApp.objects.get_or_create(
        provider='google',
        name='Google Auth'
    )
    app.client_id = CLIENT_ID
    app.secret = SECRET
    app.save()
    
    # 3. Link Site to SocialApp
    if site not in app.sites.all():
        app.sites.add(site)
        print(f"Linked Site '{DOMAIN}' to Google SocialApp.")
    else:
        print(f"Site '{DOMAIN}' already linked.")

    print("\n[SUCCESS] Production OAuth setup completed!")

if __name__ == "__main__":
    setup_production()
