import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Project.settings')
django.setup()

from django.contrib.auth.models import User
from core.db.profile import Profile
from core.db.supplier import Supplier

def populate_profiles():
    # 1. Create default profile for all users missing one
    print("Creating profiles for users missing one...")
    all_users = User.objects.all()
    created_count = 0
    for user in all_users:
        if not hasattr(user, 'profile'):
            Profile.objects.create(user=user, user_type='customer')
            created_count += 1
            
    print(f"Created {created_count} default profiles.")

    # 2. Update profiles for existing suppliers and managers to 'supplier' and sync phones
    print("Updating user_type and phone numbers for known suppliers...")
    updated_count = 0
    phone_added_count = 0
    used_phones = set()

    for supplier in Supplier.objects.all():
        # The main supplier user
        if hasattr(supplier, 'user') and supplier.user and hasattr(supplier.user, 'profile'):
            profile = supplier.user.profile
            changed = False
            
            if profile.user_type != 'supplier':
                profile.user_type = 'supplier'
                changed = True
                
            # Sync Phone Number from Supplier
            if supplier.phone:
                candidate_phone = str(supplier.phone).strip()
                if candidate_phone and candidate_phone not in used_phones:
                    profile.phone_number = candidate_phone
                    used_phones.add(candidate_phone)
                    changed = True
                    phone_added_count += 1
            
            if changed:
                profile.save()
                updated_count += 1
        
        # The managing users
        for manager in supplier.managing_users.all():
            if hasattr(manager, 'profile'):
                profile = manager.profile
                if profile.user_type != 'supplier':
                    profile.user_type = 'supplier'
                    profile.save()
                    updated_count += 1
                
    print(f"Updated {updated_count} completely (Types).")
    print(f"Imported {phone_added_count} unique phone numbers from Supplier records.")

if __name__ == '__main__':
    populate_profiles()
