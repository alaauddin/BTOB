"""Seed initial data: SystemSettings, Site, Currency, OrderWorkflow.

Run inside the Docker container:
    python manage.py seed_data
"""

from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Seed the database with essential initial data."

    def handle(self, *args, **options):
        self._seed_site()
        self._seed_system_settings()
        self._seed_currencies()
        self._seed_order_workflow()
        self.stdout.write(self.style.SUCCESS("✅ Seed data loaded successfully."))

    # ── Site ──────────────────────────────────────────────
    def _seed_site(self):
        from django.contrib.sites.models import Site

        site, created = Site.objects.update_or_create(
            id=1,
            defaults={
                "domain": "aratatt.com",
                "name": "BTOB Platform",
            },
        )
        status = "Created" if created else "Updated"
        self.stdout.write(f"  📌 Site: {status} → {site.domain}")

    # ── SystemSettings ───────────────────────────────────
    def _seed_system_settings(self):
        from core.models import SystemSettings

        if SystemSettings.objects.exists():
            self.stdout.write("  ⚙️  SystemSettings: already exists, skipping.")
            return

        settings = SystemSettings.objects.create(
            site_name="رواج",
            description="منصة رواج — متجرك الإلكتروني المتكامل.",
            customer_service_number="+967 777 777 777",
            company_email="support@aratatt.com",
            seo_title="رواج | منصة التجارة الإلكترونية",
            seo_description="منصة متكاملة توفر لك تجربة تسوق فريدة ومميزة.",
            seo_keywords="تسوق,متجر,رواج,يمن,تجارة إلكترونية",
            show_download_app=False,
            show_merchant_agreement=False,
        )
        self.stdout.write(f"  ⚙️  SystemSettings: Created → {settings.site_name}")

    # ── Currencies ───────────────────────────────────────
    def _seed_currencies(self):
        from core.models import Currency

        currencies = [
            {"name": "Yemeni Rial", "code": "YER", "symbol": "ر.ي"},
            {"name": "Saudi Riyal", "code": "SAR", "symbol": "ر.س"},
            {"name": "US Dollar", "code": "USD", "symbol": "$"},
        ]
        for cur in currencies:
            obj, created = Currency.objects.get_or_create(
                code=cur["code"],
                defaults=cur,
            )
            status = "Created" if created else "Exists"
            self.stdout.write(f"  💰 Currency: {status} → {obj.code} ({obj.symbol})")

    # ── Order Workflow ───────────────────────────────────
    def _seed_order_workflow(self):
        from core.models import OrderWorkflow, OrderStatus, WorkflowStep

        # Default statuses
        statuses = [
            {"name": "قيد الانتظار", "slug": "pending"},
            {"name": "مؤكد", "slug": "confirmed"},
            {"name": "قيد التجهيز", "slug": "preparing"},
            {"name": "قيد التوصيل", "slug": "delivering"},
            {"name": "تم التسليم", "slug": "delivered"},
            {"name": "ملغي", "slug": "cancelled"},
        ]
        status_objs = {}
        for s in statuses:
            obj, created = OrderStatus.objects.get_or_create(
                slug=s["slug"],
                defaults={"name": s["name"]},
            )
            status_objs[s["slug"]] = obj
            status = "Created" if created else "Exists"
            self.stdout.write(f"  📋 Status: {status} → {obj.name}")

        # Default workflow
        workflow, created = OrderWorkflow.objects.get_or_create(
            name="المسار الافتراضي",
        )
        status = "Created" if created else "Exists"
        self.stdout.write(f"  🔄 Workflow: {status} → {workflow.name}")

        if created:
            order = ["pending", "confirmed", "preparing", "delivering", "delivered"]
            for i, slug in enumerate(order):
                WorkflowStep.objects.create(
                    workflow=workflow,
                    status=status_objs[slug],
                    order=i + 1,
                    decrease_stock=(slug == "confirmed"),
                )
            self.stdout.write(f"     → Created {len(order)} workflow steps")
