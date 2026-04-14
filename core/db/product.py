"""Product-related models: Category, ProductCategory, Product, ProductImage."""

from django.db import models
from django.utils import timezone

from core.db.utils import upload_to_path
from core.db.supplier import Supplier


class Category(models.Model):
    name = models.CharField(max_length=100)

    class Meta:
        app_label = 'core'

    def __str__(self):
        return self.name


class ProductCategory(models.Model):
    category = models.ForeignKey(Category, on_delete=models.CASCADE, default=1)
    name = models.CharField(max_length=100)

    class Meta:
        app_label = 'core'

    def __str__(self):
        return f"{self.category.name} > {self.name}"


class Product(models.Model):
    supplier = models.ForeignKey(Supplier, on_delete=models.CASCADE, related_name='products')
    category = models.ForeignKey(ProductCategory, on_delete=models.CASCADE, related_name='products')
    name = models.CharField(max_length=255)
    description = models.TextField()
    price = models.DecimalField(max_digits=10, decimal_places=2)
    image = models.ImageField(upload_to=upload_to_path)
    video = models.FileField(upload_to=upload_to_path, null=True, blank=True, verbose_name="فيديو المنتج")
    is_new = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    views_count = models.PositiveIntegerField(default=0, verbose_name="عدد المشاهدات")
    stock = models.PositiveIntegerField(default=0, verbose_name="المخزون")

    # New Wholesale/Dropshipping fields
    wholesale_origin = models.ForeignKey('core.WholesaleProduct', on_delete=models.SET_NULL, null=True, blank=True, related_name='imported_products', verbose_name="المصدر (الجملة)")
    purchase_cost = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, verbose_name="تكلفة الشراء")

    class Meta:
        app_label = 'core'

    def __str__(self):
        return self.name

    def get_price_with_offer(self):
        from core.db.offer import ProductOffer
        today = timezone.now().date()

        offers = ProductOffer.objects.filter(
            product=self,
            is_active=True,
            from_date__lte=today,
            to_date__gte=today
        )
        if offers.exists():
            return offers.first().get_price_with_discount()
        else:
            return self.price

    def has_discount(self):
        from core.db.offer import ProductOffer
        today = timezone.now().date()
        offers = ProductOffer.objects.filter(
            product=self,
            is_active=True,
            from_date__lte=today,
            to_date__gte=today
        )
        return offers.exists()

    def get_discount_precentage(self):
        from core.db.offer import ProductOffer
        today = timezone.now().date()
        offers = ProductOffer.objects.filter(
            product=self,
            is_active=True,
            from_date__lte=today,
            to_date__gte=today
        ).first()
        return round(offers.get_discount_percentage_offer())

    def get_average_rating(self):
        reviews = self.review_set.all()
        if reviews:
            return round(sum([review.rating for review in reviews]) / len(reviews), 1)
        else:
            return 0.0

    def get_total_reviews(self):
        return self.review_set.count()

    def has_attributes(self):
        """Check if the product has any selectable attributes."""
        return self.attributes.exists()

    def get_attribute_names_display(self):
        """Return a comma-separated list of attribute names."""
        return ", ".join([attr.name for attr in self.attributes.all()])

    def get_total_price(self, option_ids=None, with_offer=True):
        """Calculate total price including base price (optionally with offer) and all selected option modifiers."""
        base = self.get_price_with_offer() if with_offer else self.price
        if not option_ids:
            return base
            
        modifiers = ProductAttributeOption.objects.filter(id__in=option_ids).aggregate(
            total=models.Sum('price_modifier')
        )['total'] or 0
        return base + modifiers


class ProductAttribute(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='attributes')
    name = models.CharField(max_length=100, verbose_name="اسم السمة (مثل: المقاس أو اللون)")

    class Meta:
        app_label = 'core'

    def __str__(self):
        return f"{self.name} for {self.product.name}"


class ProductAttributeOption(models.Model):
    attribute = models.ForeignKey(ProductAttribute, on_delete=models.CASCADE, related_name='options')
    value = models.CharField(max_length=100, verbose_name="القيمة (مثل: XL أو أحمر)")
    price_modifier = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        default=0.00, 
        verbose_name="تعديل السعر (اختياري)"
    )

    class Meta:
        app_label = 'core'

    def __str__(self):
        return f"{self.value} ({self.attribute.name})"


class ProductImage(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='additional_images')
    image = models.ImageField(upload_to=upload_to_path, verbose_name="صورة إضافية")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        app_label = 'core'

    def __str__(self):
        return f"Image for {self.product.name}"
