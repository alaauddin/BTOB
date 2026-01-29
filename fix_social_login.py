import os
import django

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Project.settings')
django.setup()

from django.contrib.sites.models import Site
from allauth.socialaccount.models import SocialApp
from django.conf import settings

def fix_social_login():
    print("--- Social Login Diagnostic & Fix Script ---")
    
    # 1. Check Site
    site_id = getattr(settings, 'SITE_ID', 1)
    print(f"Current SITE_ID in settings: {site_id}")
    
    site = Site.objects.filter(id=site_id).first()
    if not site:
        print(f"ERROR: Site with ID {site_id} does not exist in the database.")
        # Try to find any site
        site = Site.objects.first()
        if site:
            print(f"Found alternative site: ID={site.id}, Domain={site.domain}. Suggest updating settings.py to SITE_ID = {site.id}")
        else:
            print("Creating default site (domain: aratatt.com)...")
            site = Site.objects.create(id=site_id, domain='aratatt.com', name='Aratatt')
    else:
        print(f"Site found: ID={site.id}, Domain={site.domain}")

    # 2. Check SocialApp
    apps = SocialApp.objects.filter(provider='google')
    if not apps.exists():
        print("ERROR: No Google SocialApp found in database.")
        print("Please create one in the Django Admin (/admin/socialaccount/socialapp/)")
    else:
        for app in apps:
            print(f"Found App: {app.name} (Client ID: {app.client_id[:10]}...)")
            
            # 3. Check linkage
            if site not in app.sites.all():
                print(f"FIXING: Linking app '{app.name}' to site '{site.domain}'...")
                app.sites.add(site)
                print("Linkage complete.")
            else:
                print(f"App '{app.name}' is correctly linked to site '{site.domain}'.")

    print("\n--- Summary ---")
    print(f"1. Ensure 'SITE_ID = {site.id}' is in settings.py")
    print(f"2. Ensure the domain '{site.domain}' matches your live URL exactly.")
    print(f"3. Ensure your Google Console redirect URI is: https://{site.domain}/accounts/google/login/callback/")
    print("------------------------------------------")

if __name__ == "__main__":
    fix_social_login()
