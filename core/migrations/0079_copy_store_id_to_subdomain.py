# Generated manually: copy store_id to subdomain for existing suppliers

import re

from django.db import migrations


def copy_store_id_to_subdomain(apps, schema_editor):
    """Copy each Supplier's store_id to the new subdomain field.

    Only copies if:
    - store_id is not empty
    - subdomain is still empty
    - store_id passes the subdomain format (lowercase alphanumeric + hyphens)
    """
    Supplier = apps.get_model('core', 'Supplier')
    pattern = re.compile(r'^[a-z0-9]([a-z0-9-]*[a-z0-9])?$')
    updated = 0

    for supplier in Supplier.objects.filter(subdomain__isnull=True).exclude(store_id__isnull=True).exclude(store_id=''):
        candidate = supplier.store_id.lower().strip()
        if pattern.match(candidate):
            supplier.subdomain = candidate
            supplier.save(update_fields=['subdomain'])
            updated += 1

    print(f"  ✅ Patched {updated} supplier(s): copied store_id → subdomain")


def reverse_copy(apps, schema_editor):
    """Reverse: clear all subdomain values."""
    Supplier = apps.get_model('core', 'Supplier')
    Supplier.objects.all().update(subdomain=None)


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0078_supplier_subdomain'),
    ]

    operations = [
        migrations.RunPython(
            copy_store_id_to_subdomain,
            reverse_code=reverse_copy,
        ),
    ]
