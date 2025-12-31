from django.core.management.base import BaseCommand
from core.models import Supplier
from django.utils.text import slugify
import uuid

class Command(BaseCommand):
    help = 'Populate store_id for Suppliers that do not have one'

    def handle(self, *args, **kwargs):
        suppliers = Supplier.objects.filter(store_id__isnull=True) | Supplier.objects.filter(store_id='')
        
        if not suppliers.exists():
            self.stdout.write(self.style.SUCCESS('No suppliers found without store_id.'))
            return

        count = 0
        for supplier in suppliers:
            # Generate a base slug from the name, fallback to 'store' if name is empty
            base_slug = slugify(supplier.name) or 'store'
            
            # Generate a unique suffix
            unique_suffix = str(uuid.uuid4())[:8]
            
            # Combine to form store_id
            new_store_id = f"{base_slug}-{unique_suffix}"
            
            # double check uniqueness (though uuid makes it highly unlikely to collide)
            while Supplier.objects.filter(store_id=new_store_id).exists():
                unique_suffix = str(uuid.uuid4())[:8]
                new_store_id = f"{base_slug}-{unique_suffix}"
            
            supplier.store_id = new_store_id
            supplier.save()
            count += 1
            self.stdout.write(self.style.SUCCESS(f'Successfully assigned store_id "{new_store_id}" to "{supplier.name}"'))

        self.stdout.write(self.style.SUCCESS(f'Finished populating store_id for {count} suppliers.'))
