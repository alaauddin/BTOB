from django.db import models
from core.db.utils import upload_to_path
from core.db.product import ProductCategory

class WholesaleSupplier(models.Model):
    name = models.CharField(max_length=255, verbose_name="اسم المورد بالجملة")
    phone = models.CharField(max_length=20, verbose_name="رقم الهاتف")
    email = models.EmailField(null=True, blank=True, verbose_name="البريد الإلكتروني")
    address = models.TextField(verbose_name="العنوان")
    is_active = models.BooleanField(default=True, verbose_name="نشط")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        app_label = 'core'
        verbose_name = "مورد جملة"
        verbose_name_plural = "موردين الجملة"

    def __str__(self):
        return self.name

class WholesaleProduct(models.Model):
    wholesaler = models.ForeignKey(WholesaleSupplier, on_delete=models.CASCADE, related_name='wholesale_products', verbose_name="المورد")
    category = models.ForeignKey(ProductCategory, on_delete=models.CASCADE, related_name='wholesale_products', verbose_name="الفئة")
    name = models.CharField(max_length=255, verbose_name="اسم المنتج")
    description = models.TextField(verbose_name="الوصف")
    purchase_price = models.DecimalField(max_digits=10, decimal_places=2, verbose_name="سعر الشراء (للمتاجر)")
    sale_price = models.DecimalField(max_digits=10, decimal_places=2, verbose_name="سعر البيع المقترح")
    stock = models.PositiveIntegerField(default=0, verbose_name="المخزون المتاح")
    image = models.ImageField(upload_to=upload_to_path, verbose_name="صورة المنتج الرئيسية")
    video = models.FileField(upload_to=upload_to_path, null=True, blank=True, verbose_name="فيديو المنتج")
    is_active = models.BooleanField(default=True, verbose_name="نشط")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        app_label = 'core'
        verbose_name = "منتج جملة"
        verbose_name_plural = "منتجات الجملة"

    def __str__(self):
        return self.name

    @property
    def potential_profit(self):
        return self.sale_price - self.purchase_price

class WholesaleProductImage(models.Model):
    product = models.ForeignKey(WholesaleProduct, on_delete=models.CASCADE, related_name='additional_images', verbose_name="المنتج")
    image = models.ImageField(upload_to=upload_to_path, verbose_name="صورة إضافية")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        app_label = 'core'
        verbose_name = "صورة منتج جملة"
        verbose_name_plural = "صور منتجات الجملة"
