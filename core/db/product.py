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


class ProductImage(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='additional_images')
    image = models.ImageField(upload_to=upload_to_path, verbose_name="صورة إضافية")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        app_label = 'core'

    def __str__(self):
        return f"Image for {self.product.name}"
