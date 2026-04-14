import os
import django
import random
from decimal import Decimal

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Project.settings')
django.setup()

from core.db import WholesaleSupplier, WholesaleProduct, WholesaleProductImage, ProductCategory
from django.core.files import File

def populate_wholesale():
    print("🚀 Starting Wholesale Population Script...")

    # 1. Ensure we have categories
    categories = ProductCategory.objects.all()
    if not categories.exists():
        print("❌ No ProductCategories found. Create some in Admin first.")
        return
    
    # 2. Create Wholesale Suppliers
    suppliers_data = [
        {"name": "شركة الاتحاد للتجارة", "phone": "777111222", "address": "صنعاء - شارع الستين"},
        {"name": "مورد الخليج للإلكترونيات", "phone": "771222333", "address": "تعز - شارع جمال"},
        {"name": "مؤسسة الأمل للمنظفات", "phone": "770333444", "address": "عدن - المنصورة"},
    ]

    for data in suppliers_data:
        supplier, created = WholesaleSupplier.objects.get_or_create(
            phone=data["phone"],
            defaults={
                "name": data["name"],
                "address": data["address"],
                "is_active": True
            }
        )
        if created:
            print(f"✅ Created Supplier: {supplier.name}")

    # 3. Create Wholesale Products
    products_data = [
        {
            "name": "سماعة بلوتوث Pro Max",
            "desc": "سماعة بلوتوث عالية الجودة مع عزل ضجيج وبطارية تدوم 40 ساعة.",
            "purchase": 15.00,
            "sale": 25.00
        },
        {
            "name": "طقم أدوات تجميل (12 قطعة)",
            "desc": "طقم متكامل للعناية بالبشرة والمكياج، ماركة عالمية.",
            "purchase": 10.00,
            "sale": 18.50
        },
        {
            "name": "ساعة ذكية SmartWatch S7",
            "desc": "ساعة ذكية تدعم قياس الأكسجين ونبضات القلب مع شاشة AMOLED.",
            "purchase": 20.00,
            "sale": 35.00
        },
        {
            "name": "شاحن سريع 65 وات",
            "desc": "شاحن جداري فائق السرعة يدعم جميع الأجهزة الذكية.",
            "purchase": 7.00,
            "sale": 12.00
        },
        {
            "name": "حقيبة لابتوب جلد طبيعي",
            "desc": "حقيبة أنيقة للابتوب مقاس 15.6 بوصة، مقاومة للماء.",
            "purchase": 12.00,
            "sale": 22.00
        }
    ]

    # Find a dummy image to use
    dummy_image_path = "media/ads_image/download_LzqxPQ2.png" # Using path found earlier
    has_image = os.path.exists(dummy_image_path)

    all_suppliers = WholesaleSupplier.objects.all()
    
    for p_data in products_data:
        wp, created = WholesaleProduct.objects.get_or_create(
            name=p_data["name"],
            defaults={
                "wholesaler": random.choice(all_suppliers),
                "category": random.choice(categories),
                "description": p_data["desc"],
                "purchase_price": Decimal(str(p_data["purchase"])),
                "sale_price": Decimal(str(p_data["sale"])),
                "stock": random.randint(50, 500),
                "is_active": True
            }
        )
        
        if created:
            if has_image:
                with open(dummy_image_path, 'rb') as f:
                    wp.image.save(os.path.basename(dummy_image_path), File(f), save=True)
            print(f"📦 Created Product: {wp.name} (Profit: {wp.potential_profit})")

    print("\n✨ Population complete! Visit the Wholesale Market to see your new products.")

if __name__ == "__main__":
    populate_wholesale()
