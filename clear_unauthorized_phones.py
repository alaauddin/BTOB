import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "Project.settings")
django.setup()

from core.db.profile import Profile
from core.db.supplier import Supplier

def clear_unauthorized_phones():
    cleared_count = 0
    # Process all profiles
    for profile in Profile.objects.all():
        if profile.user_type == 'supplier':
            # It's a supplier. Re-verify phone
            supplier = Supplier.objects.filter(user=profile.user).first()
            if not supplier:
                # Might be a managing user
                managed = Supplier.objects.filter(managing_users=profile.user).first()
                if not managed:
                    profile.phone_number = None
                    profile.save()
                    cleared_count += 1
            else:
                # If the phone doesn't match the supplier's actual phone
                if supplier.phone and profile.phone_number != str(supplier.phone).strip():
                    profile.phone_number = str(supplier.phone).strip()
                    try:
                        profile.save()
                    except Exception:
                        profile.phone_number = None
                        profile.save()
                    cleared_count += 1
                elif not supplier.phone:
                    profile.phone_number = None
                    profile.save()
                    cleared_count += 1
        else:
            # Customer / normal user: clear the phone completely!
            if profile.phone_number is not None:
                profile.phone_number = None
                profile.save()
                cleared_count += 1

    print(f"Cleared/Fixed {cleared_count} profile phones.")

if __name__ == "__main__":
    clear_unauthorized_phones()
