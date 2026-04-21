from django.core.management.base import BaseCommand
from subscriptions.models import Plan, PlanFeature

class Command(BaseCommand):
    help = 'Seed subscription plans with dynamic features'

    def handle(self, *args, **kwargs):
        # Create Basic Plan
        basic, created = Plan.objects.get_or_create(
            name="الباقة الأساسية",
            defaults={
                'price': 10.00,
                'currency': 'د.ك',
                'duration_days': 30,
                'description': 'باقة اقتصادية للمتاجر الصغيرة'
            }
        )
        if not created:
            basic.price = 10.00
            basic.currency = 'د.ك'
            basic.save()

        basic.features.all().delete()
        PlanFeature.objects.create(plan=basic, title="إضافة حتى 50 منتج", order=1)
        PlanFeature.objects.create(plan=basic, title="دعم فني عبر البريد", order=2)
        PlanFeature.objects.create(plan=basic, title="نظام سائقين متقدم", is_included=False, order=3)

        # Create Pro Plan
        pro, created = Plan.objects.get_or_create(
            name="باقة برو",
            defaults={
                'price': 25.00,
                'currency': 'د.ك',
                'duration_days': 30,
                'description': 'باقة متكاملة للمتاجر المتنامية'
            }
        )
        if not created:
            pro.price = 25.00
            pro.currency = 'د.ك'
            pro.save()

        pro.features.all().delete()
        PlanFeature.objects.create(plan=pro, title="منتجات غير محدودة", order=1)
        PlanFeature.objects.create(plan=pro, title="دعم فني 24/7", order=2)
        PlanFeature.objects.create(plan=pro, title="نظام سائقين متقدم", order=3)
        PlanFeature.objects.create(plan=pro, title="تقارير مبيعات تفصيلية", order=4)

        self.stdout.write(self.style.SUCCESS('Successfully seeded plans and features'))
