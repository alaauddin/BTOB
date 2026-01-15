from django.db import models
from django.contrib.auth.models import User
from decimal import Decimal
from django.utils import timezone
import math
import os
import uuid


def upload_to_path(instance, filename):
    ext = filename.split('.')[-1]
    new_filename = f"{uuid.uuid4().hex}.{ext}"
    model_name = instance._meta.model_name
    
    if model_name == 'suppliercategory':
        return os.path.join('images/supplier_category_images/', new_filename)
    elif model_name == 'supplier':
        return os.path.join('images/supplier_images/', new_filename)
    elif model_name == 'product':
        return os.path.join('images/product_images/', new_filename)
    elif model_name == 'suppierads':
        return os.path.join('ads_image/', new_filename)
    elif model_name == 'systemsettings':
        return os.path.join('system/', new_filename)
    elif model_name == 'businessrequest':
        return os.path.join('business_requests/', new_filename)
    
    return os.path.join('uploads/', new_filename)


CITY_CHO=[('Sanaa','Sanaa'),('Aden','Aden'),('Tize','Tize')]
COUNTRY_CHO=[('Yemen','Yemen')]


class OrderStatus(models.Model):
    name = models.CharField(max_length=100)
    slug = models.SlugField(max_length=100, unique=True)
    description = models.TextField(blank=True, null=True)
    is_terminal = models.BooleanField(default=False)

    def __str__(self):
        return self.name

class OrderWorkflow(models.Model):
    name = models.CharField(max_length=100)
    is_default = models.BooleanField(default=False)

    def __str__(self):
        return self.name

class WorkflowStep(models.Model):
    workflow = models.ForeignKey(OrderWorkflow, on_delete=models.CASCADE, related_name='steps')
    status = models.ForeignKey(OrderStatus, on_delete=models.CASCADE)
    priority = models.PositiveIntegerField()
    requires_payment = models.BooleanField(default=False, verbose_name="يتطلب سداد كامل")

    class Meta:
        ordering = ['priority']
        unique_together = ['workflow', 'status']

    def __str__(self):
        return f"{self.workflow.name} - {self.status.name} ({self.priority})"



class SupplierCategory(models.Model):
    image = models.ImageField(upload_to=upload_to_path, blank=True, null=True)
    name = models.CharField(max_length=100)
    producing_family = models.BooleanField(default=False)
    def __str__(self):
        return self.name

class Currency(models.Model):
    name = models.CharField(max_length=100, verbose_name="اسم العملة")
    code = models.CharField(max_length=10, unique=True, verbose_name="رمز العملة (ISO)")
    symbol = models.CharField(max_length=10, verbose_name="الرمز (الشعار)")

    def __str__(self):
        return self.symbol


class Supplier(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='supplier')
    name = models.CharField(max_length=100)
    store_id = models.SlugField(max_length=100, unique=True, null=True, blank=True)
    phone = models.CharField(max_length=15)
    address = models.CharField(max_length=255)
    city = models.CharField(max_length=100,choices=CITY_CHO)
    country = models.CharField(max_length=100, choices=COUNTRY_CHO)
    category = models.ManyToManyField(SupplierCategory)
    primary_color = models.CharField(max_length=7, default='#ef7d2d')
    secondary_color = models.CharField(max_length=7, default='#ffffff')
    navbar_color = models.CharField(max_length=7, default='#ef7d2d')
    footer_color = models.CharField(max_length=7, default='#3a505e')
    text_color = models.CharField(max_length=7, default='#3a505e')
    accent_color = models.CharField(max_length=7, default='#9abfc4')
    currency = models.ForeignKey(Currency, on_delete=models.SET_NULL, null=True, blank=True)
    profile_picture = models.ImageField(upload_to=upload_to_path, blank=True, null=True)
    panal_picture = models.ImageField(upload_to=upload_to_path, blank=True, null=True)
    workflow = models.ForeignKey(OrderWorkflow, on_delete=models.SET_NULL, null=True, blank=True)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    delivery_fee_ratio = models.DecimalField(max_digits=10, decimal_places=2, default=0.00, verbose_name="نسبة رسوم التوصيل لكل كم")
    enable_delivery_fees = models.BooleanField(default=False, verbose_name="تفعيل رسوم التوصيل")
    show_order_amounts = models.BooleanField(default=True, verbose_name="عرض مبالغ الطلبات")
    show_platform_ads = models.BooleanField(default=True, verbose_name="عرض إعلانات المنصة")
    priority = models.IntegerField(default=0, verbose_name="الأولوية (الأعلى يظهر أولاً)")
    views_count = models.PositiveIntegerField(default=0, verbose_name="عدد المشاهدات")
    can_add_categories = models.BooleanField(default=False, verbose_name="إضافة فئات")
    can_add_product_categories = models.BooleanField(default=False, verbose_name="إضافة فئات المنتجات")
    is_active = models.BooleanField(default=True, verbose_name="نشط")
    
    def __str__(self):
        return self.name
    
    def save(self, *args, **kwargs):
        if self.pk:
            old_instance = Supplier.objects.filter(pk=self.pk).first()
            if old_instance and old_instance.is_active and not self.is_active:
                # Deactivating supplier: deactivate ads
                self.supplier_ads.all().update(is_active=False)
                PlatformOfferAd.objects.filter(product__supplier=self).update(is_approved=False)
        super().save(*args, **kwargs)
    
    def get_total_sales_for_current_month(self):
        orders = Order.objects.filter(
            order_items__product__supplier=self,
            pipeline_status__slug='confirmed', 
            created_at__month=timezone.now().month
        ).distinct()
        return sum([order.get_total_amount() for order in orders])

    def get_total_sales_count(self):
        return Order.objects.filter(
            order_items__product__supplier=self,
            pipeline_status__slug='confirmed'
        ).distinct().count()

    def get_average_rating(self):
        from core.models import Review
        from django.db.models import Avg
        avg_rating = Review.objects.filter(product__supplier=self).aggregate(Avg('rating'))['rating__avg']
        return round(float(avg_rating), 1) if avg_rating is not None else 0.0

class Category(models.Model):
    name = models.CharField(max_length=100)
    def __str__(self):
        return self.name

class ProductCategory(models.Model):
    category = models.ForeignKey(Category, on_delete=models.CASCADE, default=1)
    name = models.CharField(max_length=100)
    
    def __str__(self):
        return f"{self.category.name} > {self.name}"

class Product(models.Model):
    supplier = models.ForeignKey(Supplier, on_delete=models.CASCADE, related_name='products')
    category = models.ForeignKey(ProductCategory, on_delete=models.CASCADE,related_name='products')
    name = models.CharField(max_length=255)
    description = models.TextField()
    price = models.DecimalField(max_digits=10, decimal_places=2)
    image = models.ImageField(upload_to=upload_to_path)
    video = models.FileField(upload_to=upload_to_path, null=True, blank=True, verbose_name="فيديو المنتج")
    is_new = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    views_count = models.PositiveIntegerField(default=0, verbose_name="عدد المشاهدات")
    
    def __str__(self):
        return self.name


    def get_price_with_offer(self):
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
        today = timezone.now().date()
        offers = ProductOffer.objects.filter(
            product=self,
            is_active=True,
            from_date__lte=today,
            to_date__gte=today
        )       
        return offers.exists()
    
    def get_discount_precentage(self):
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

    def __str__(self):
        return f"Image for {self.product.name}"


class WishList(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='wishlist')
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='wishlist')
    
    def __str__(self):
        return f"{self.user.username} | {self.product.name}"
    
    
class ProductOffer(models.Model):
    product = models.ForeignKey(Product,on_delete=models.CASCADE, related_name='products_offer')
    is_active = models.BooleanField(default=True)
    discount_precentage = models.DecimalField(max_digits=10, decimal_places=2)
    from_date = models.DateField()
    to_date = models.DateField()
    create_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(User,on_delete=models.CASCADE,related_name='products_offer')
    
    
    def __str__(self):
        price_after_discount = self.product.price - (self.product.price * self.discount_precentage)
        return str(self.product) + " | "+str(self.product.price)+" |after discount: " +str(price_after_discount)
    
    
    def get_price_with_discount(self):
        price_after_discount = self.product.price - (self.product.price * self.discount_precentage)
        return price_after_discount
    
    
    def get_discount_percentage_offer(self):
        return self.discount_precentage * 100
    

    
    def save(self, *args, **kwargs):
        # check if it is edit the it is fine and save it
        if not self.pk:
            if self.is_active:
                other_offers = ProductOffer.objects.filter(product=self.product,is_active=True).exists()
                if not other_offers:
                    super().save(*args, **kwargs)
            else:
                super().save(*args, **kwargs)
        else:
            super().save(*args, **kwargs)
            
        


    
    



class Cart(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='cart')
    supplier = models.ForeignKey(Supplier, on_delete=models.CASCADE)
    def __str__(self):
        return f"Cart for {self.user.username}"
    
    
    def get_total_items(self):
        return sum([item.quantity for item in self.cart_items.all()])
    

    def get_total_amount(self):
        return sum([item.get_subtotal() for item in self.cart_items.all()])
    
    def get_total_ammout_with_discout(self):
        total_with_discount = sum([item.get_subtotal_with_discount() for item in self.cart_items.all()])
        return self.get_total_amount() - total_with_discount
    
    def get_total_after_discount(self):
        return sum([item.get_subtotal_with_discount() for item in self.cart_items.all()])
    
    def has_discount(self):
        cart_items = self.cart_items.all()
        for cart_item in cart_items:
            if cart_item.has_discount():
                return True
        return False
        
        
class CartItem(models.Model):
    cart = models.ForeignKey(Cart, on_delete=models.CASCADE, related_name='cart_items')
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='cart_items')
    quantity = models.PositiveIntegerField(default=1)
    
    def __str__(self):
        return f"{self.quantity} of {self.product.name} in cart"
    
    def get_subtotal(self):
        return self.product.price * self.quantity
    
    def get_subtotal_with_discount(self):
        return self.product.get_price_with_offer() * self.quantity
    
    def has_discount(self):
       return self.product.has_discount()
    
    
    

    
    

    
class Order(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    items = models.ManyToManyField(Product, through='OrderItem')
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)
    pipeline_status = models.ForeignKey(OrderStatus, on_delete=models.PROTECT, null=True, blank=True)
    
    def __str__(self):
        return f"Order {self.id} by {self.user.username}"
    
    def get_payment_total(self):
        """Calculate total amount recorded in payment references"""
        return self.payment_references.aggregate(total=models.Sum('amount'))['total'] or 0
    
    def is_fully_paid(self):
        """Check if total payment references meet or exceed order total"""
        return self.get_payment_total() >= self.total_amount
    
    def get_current_workflow_step(self):
        supplier = self.get_supplier()
        if not supplier or not supplier.workflow or not self.pipeline_status:
            return None
        return WorkflowStep.objects.filter(workflow=supplier.workflow, status=self.pipeline_status).first()

    def get_next_status(self):
        current_step = self.get_current_workflow_step()
        if not current_step:
            return None
        
        next_step = WorkflowStep.objects.filter(
            workflow=current_step.workflow,
            priority__gt=current_step.priority
        ).order_by('priority').first()
        
        return next_step.status if next_step else None

    def save(self, *args, **kwargs):
        if not self.pipeline_status:
            # We use a lazy import or just call the model since it is in the same file
            self.pipeline_status = OrderStatus.objects.filter(slug='pending').first()
        super().save(*args, **kwargs)

    def move_to_next_status(self):
        current_step = self.get_current_workflow_step()
        if not current_step:
            return False, "لا يمكن العثور على الخطوة الحالية في سير العمل."
            
        # Check conditions for CURRENT status before moving
        if current_step.requires_payment and not self.is_fully_paid():
            return False, f"لا يمكن الانتقال: يتوجب سداد كامل المبلغ ({self.total_amount}) لهذا الطلب أولاً."

        next_status = self.get_next_status()
        if next_status:
            self.pipeline_status = next_status
            self.save()
            return True, f"تم تحديث حالة الطلب إلى: {next_status.name}"
        return False, "تم الوصول لآخر مرحلة في سير العمل."
    
    def set_total_amount(self):
        items_total = sum([item.get_subtotal_with_discount() for item in self.order_items.all()])
        delivery_fee = self.get_expected_delivery_fee()
        self.total_amount = items_total + delivery_fee
        self.save()

    def get_expected_delivery_fee(self):
        supplier = self.get_supplier()
        if not supplier or not supplier.enable_delivery_fees:
            return Decimal('0')
            
        shipping_address = self.shippingaddress_set.first()
        if not shipping_address:
            return Decimal('0')
            
        if supplier.latitude and supplier.longitude and shipping_address.latitude and shipping_address.longitude:
            distance = self.calculate_distance(
                supplier.latitude, supplier.longitude,
                shipping_address.latitude, shipping_address.longitude
            )
            if distance:
                fee = float(distance) * float(supplier.delivery_fee_ratio or 0)
                return Decimal(str(fee)).quantize(Decimal('0.01'))
        return Decimal('0')

    def calculate_distance(self, lat1, lon1, lat2, lon2):
        """Calculate the great circle distance between two points in km"""
        if not all([lat1, lon1, lat2, lon2]):
            return None
        R = 6371  # Earth radius in km
        phi1, phi2 = math.radians(float(lat1)), math.radians(float(lat2))
        dphi = math.radians(float(lat2) - float(lat1))
        dlambda = math.radians(float(lon2) - float(lon1))
        a = math.sin(dphi / 2)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2)**2
        return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    def get_total_amount(self):
        items_total = sum([item.get_subtotal() for item in self.order_items.all()])
        return items_total
    
    def get_total_ammout_with_discout(self):
        return sum([item.get_subtotal_with_discount() for item in self.order_items.all()])
    
    def get_total_after_discount(self):
        return self.get_total_ammout_with_discout() + self.get_expected_delivery_fee()

    def get_discount_amount(self):
        items_gross = sum([item.get_subtotal() for item in self.order_items.all()])
        return items_gross - self.get_total_ammout_with_discout()
    
    def get_supplier(self):
        return self.order_items.first().product.supplier
    
    def has_discount(self):
        order_items = self.order_items.all()
        for order_item in order_items:
            if order_item.has_discount():
                return True
        return False
    
    
    

    


class ShippingAddress(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE)
    phone = models.IntegerField()
    address_line1 = models.CharField(max_length=255)
    address_line2 = models.CharField(max_length=255, blank=True, null=True)
    city = models.CharField(max_length=100,choices=CITY_CHO)
    country = models.CharField(max_length=100, choices=COUNTRY_CHO)
    postal_code = models.CharField(max_length=20,blank=True, null=True)
    address_type = models.CharField(max_length=50)  # Shipping or Billing
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)


    def __str__(self):
        return "Address of " + str(self.order)




class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='order_items')
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField(default=1)
    
    def __str__(self):
        return f"{self.quantity} x {self.product.name} in Order {self.order.id}"

    def get_subtotal(self):
        return self.product.price * self.quantity
    
    def get_subtotal_with_discount(self):
        return self.product.get_price_with_offer() * self.quantity
    
    def has_discount(self):
       return self.product.has_discount()


class OrderNote(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='notes')
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    note = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Note on Order {self.order.id} by {self.user.username}"


class OrderPaymentReference(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='payment_references')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    reference_number = models.CharField(max_length=100)
    recorded_by = models.ForeignKey(User, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Payment Ref {self.reference_number} for Order {self.order.id}"
    


class Payment(models.Model):
    order = models.OneToOneField(Order, on_delete=models.CASCADE)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    payment_method = models.CharField(max_length=100)
    timestamp = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"Payment for Order {self.order.id}"


class Address(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='address')
    phone = models.IntegerField()
    address_line1 = models.CharField(max_length=255)
    address_line2 = models.CharField(max_length=255, blank=True, null=True)
    city = models.CharField(max_length=100)
    country = models.CharField(max_length=100)
    postal_code = models.CharField(max_length=20,blank=True, null=True)
    address_type = models.CharField(max_length=50)  # Shipping or Billing
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    
    def __str__(self):
        return f"{self.address_type} address of {self.user.username}"

class Review(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    rating = models.IntegerField()
    comment = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"Review for {self.product.name} by {self.user.username}"

class Promotion(models.Model):
    supplier = models.ForeignKey(Supplier, on_delete=models.CASCADE)
    name = models.CharField(max_length=100)
    description = models.TextField()
    start_date = models.DateField()
    end_date = models.DateField()
    
    def __str__(self):
        return self.name

class Discount(models.Model):
    promotion = models.ForeignKey(Promotion, on_delete=models.CASCADE)
    code = models.CharField(max_length=50, unique=True)
    discount_amount = models.DecimalField(max_digits=5, decimal_places=2)
    
    def __str__(self):
        return f"{self.code} - {self.discount_amount}% off"
    
    
class SupplierAds(models.Model):
    supplier = models.ForeignKey(Supplier,on_delete=models.CASCADE,related_name='supplier_ads')
    title = models.CharField(max_length=200,null=True,blank=True)
    description = models.TextField(max_length=1000,null=True,blank=True)
    image = models.ImageField(upload_to=upload_to_path)
    created_by = models.ForeignKey(User,on_delete=models.CASCADE,related_name='supplier_ads')
    created_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)
    product = models.ForeignKey(Product,on_delete=models.CASCADE,related_name='supplier_ads',null=True,blank=True)
    
    
    def __str__(self):
        return str(self.supplier) + " | " + str(self.title)
    
class PlatformOfferAd(models.Model):
    product = models.ForeignKey(Product,on_delete=models.CASCADE,related_name='platform_offers')
    description = models.TextField()
    start_date = models.DateField()
    end_date = models.DateField()
    order = models.IntegerField(default=0)
    is_approved = models.BooleanField(default=False)
    
    def __str__(self):
        return str(self.product) + " | " + str(self.order)



COUNTRY_CHO=[('Yemen','Yemen')]


class SystemSettings(models.Model):
    site_name = models.CharField(max_length=100, default="متجرك الإلكتروني", verbose_name="اسم الموقع")
    logo = models.ImageField(upload_to=upload_to_path, null=True, blank=True, verbose_name="الشعار")
    description = models.TextField(default="منصة متكاملة توفر لك تجربة تسوق فريدة ومميزة.", verbose_name="وصف الموقع")
    
    # Contact Info
    customer_service_number = models.CharField(max_length=20, default="+966 50 123 4567", verbose_name="رقم خدمة العملاء (موبايل)")
    company_email = models.EmailField(default="support@store.com", verbose_name="البريد الإلكتروني للشركة")
    company_landline = models.CharField(max_length=20, null=True, blank=True, verbose_name="رقم الهاتف الأرضي")
    
    # Social Media
    twitter_url = models.URLField(blank=True, verbose_name="رابط تويتر")
    instagram_url = models.URLField(blank=True, verbose_name="رابط انستقرام")
    whatsapp_number = models.CharField(max_length=20, blank=True, verbose_name="رقم واتساب للدعم")
    
    # App Links
    show_download_app = models.BooleanField(default=True, verbose_name="عرض روابط تحميل التطبيق")
    app_store_link = models.URLField(blank=True, verbose_name="رابط App Store")
    google_play_link = models.URLField(blank=True, verbose_name="رابط Google Play")
    laoder_image = models.ImageField(upload_to=upload_to_path, null=True, blank=True, verbose_name="صورة التحميل")

    # SEO Settings
    seo_title = models.CharField(max_length=255, null=True, blank=True, verbose_name="العنوان لمحركات البحث (SEO Title)")
    seo_description = models.TextField(null=True, blank=True, verbose_name="الوصف لمحركات البحث (SEO Description)")
    seo_keywords = models.TextField(null=True, blank=True, verbose_name="الكلمات المفتاحية (SEO Keywords)")
    
    whatsapp_api_url = models.URLField(blank=True, verbose_name="رابط API واتساب")
    whatsapp_api_key = models.CharField(max_length=500, blank=True, verbose_name="الكود API واتساب")



    class Meta:
        verbose_name = "إعدادات النظام"
        verbose_name_plural = "إعدادات النظام"

    def __str__(self):
        return self.site_name

    def save(self, *args, **kwargs):
        # Allow only one instance
        if not self.pk and SystemSettings.objects.exists():
            return
        super(SystemSettings, self).save(*args, **kwargs)


class BusinessRequest(models.Model):
    name = models.CharField(max_length=200, verbose_name="اسم النشاط التجاري")
    owner_name = models.CharField(max_length=200, verbose_name="اسم صاحب النشاط")
    email = models.EmailField(verbose_name="البريد الإلكتروني")
    phone = models.CharField(max_length=20, verbose_name="رقم الهاتف")
    business_type = models.CharField(max_length=100, verbose_name="نوع النشاط")
    message = models.TextField(verbose_name="رسالة إضافية", blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    is_processed = models.BooleanField(default=False, verbose_name="تمت المعالجة")

    class Meta:
        verbose_name = "طلب انضمام نشاط تجاري"
        verbose_name_plural = "طلبات انضمام الأنشطة التجارية"

    def __str__(self):
        return self.name
