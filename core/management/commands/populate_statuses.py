from django.core.management.base import BaseCommand
from core.models import OrderStatus

class Command(BaseCommand):
    help = 'Populate initial OrderStatus data'

    def handle(self, *args, **kwargs):
        statuses = [
            {
                'name': 'معلق',
                'slug': 'pending',
                'description': 'الطلب بانتظار التأكيد',
                'is_terminal': False
            },
            {
                'name': 'تم التأكيد',
                'slug': 'confirmed',
                'description': 'تم تأكيد الطلب وجاري التجهيز',
                'is_terminal': False
            },
            {
                'name': 'جاري التوصيل',
                'slug': 'shipped',
                'description': 'الطلب خرج للتوصيل',
                'is_terminal': False
            },
            {
                'name': 'تم التوصيل',
                'slug': 'delivered',
                'description': 'تم توصيل الطلب بنجاح',
                'is_terminal': True
            },
            {
                'name': 'ملغي',
                'slug': 'cancelled',
                'description': 'تم إلغاء الطلب',
                'is_terminal': True
            },
        ]

        count = 0
        for status_data in statuses:
            status, created = OrderStatus.objects.get_or_create(
                slug=status_data['slug'],
                defaults=status_data
            )
            if created:
                count += 1
                self.stdout.write(self.style.SUCCESS(f'Created status: {status.name} ({status.slug})'))
            else:
                # Update existing if needed, or just skip
                updated = False
                for key, value in status_data.items():
                    if getattr(status, key) != value:
                        setattr(status, key, value)
                        updated = True
                
                if updated:
                    status.save()
                    self.stdout.write(self.style.SUCCESS(f'Updated status: {status.name} ({status.slug})'))
                else:
                    self.stdout.write(self.style.WARNING(f'Status already exists: {status.name} ({status.slug})'))

        self.stdout.write(self.style.SUCCESS(f'Successfully populated {count} new statuses.'))
