from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone


CITY_CHO=[('Sanaa','Sanaa'),('Aden','Aden'),('Tize','Tize')]
COUNTRY_CHO=[('Yemen','Yemen')]



class SupplierCategory(models.Model):
    name = models.CharField(max_length=100)
    def __str__(self):
        return self.name

class Supplier(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='supplier')
    name = models.CharField(max_length=100)
    phone = models.IntegerField()
    address = models.CharField(max_length=255)
    city = models.CharField(max_length=100,choices=CITY_CHO)
    country = models.CharField(max_length=100, choices=COUNTRY_CHO)
    profile_picture = models.ImageField(upload_to='images/supplier_images/', blank=True, null=True)
    category = models.ManyToManyField(SupplierCategory)
    
    
    def __str__(self):
        return self.name
    
    def get_total_sales_for_current_month(self):
        orders = Order.objects.filter(order_items__product__supplier=self,status='Confirmed', created_at__month=timezone.now().month).distinct()
        return sum([order.get_total_amount() for order in orders])

class Category(models.Model):
    supplier = models.ForeignKey(Supplier, on_delete=models.CASCADE,related_name='categories')
    name = models.CharField(max_length=100)
    def __str__(self):
        return self.name

class ProductCategory(models.Model):
    category = models.ForeignKey(Category, on_delete=models.CASCADE, default=1)
    name = models.CharField(max_length=100)
    
    def __str__(self):
        return self.name

class Product(models.Model):
    supplier = models.ForeignKey(Supplier, on_delete=models.CASCADE, related_name='products')
    category = models.ForeignKey(ProductCategory, on_delete=models.CASCADE,related_name='products')
    name = models.CharField(max_length=255)
    description = models.TextField()
    price = models.DecimalField(max_digits=10, decimal_places=2)
    image = models.ImageField(upload_to='images/product_images/')
    is_new = models.BooleanField(default=False)
    
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
            return int(sum([review.rating for review in reviews]) / len(reviews))
        else:
            return 0
        
    def get_total_reviews(self):
        return self.review_set.count()


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

class CartItem(models.Model):
    cart = models.ForeignKey(Cart, on_delete=models.CASCADE, related_name='cart_items')
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='cart_items')
    quantity = models.PositiveIntegerField(default=1)
    
    def __str__(self):
        return f"{self.quantity} of {self.product.name} in cart"
    
    def get_subtotal(self):
        return self.product.price * self.quantity
    

    
    

    
class Order(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    items = models.ManyToManyField(Product, through='OrderItem')
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=50,choices=[('Pending','Pending'),('Confirmed','Confirmed')], default='Pending')
    
    def __str__(self):
        return f"Order {self.id} by {self.user.username}"
    
    def set_total_amount(self):
        self.total_amount = sum([item.get_subtotal() for item in self.order_items.all()])
        self.save()

    def get_total_amount(self):
        return sum([item.get_subtotal() for item in self.order_items.all()])
    
    def get_supplier(self):
        return self.order_items.first().product.supplier
    

    


class ShippingAddress(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE)
    phone = models.IntegerField()
    address_line1 = models.CharField(max_length=255)
    address_line2 = models.CharField(max_length=255, blank=True, null=True)
    city = models.CharField(max_length=100,choices=CITY_CHO)
    country = models.CharField(max_length=100, choices=COUNTRY_CHO)
    postal_code = models.CharField(max_length=20,blank=True, null=True)
    address_type = models.CharField(max_length=50)  # Shipping or Billing


    def __str__(self):
        return "Address of " + str(self.order)




class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='order_items')
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField(default=1)
    
    def __str__(self):
        return f"{self.quantity} of {self.product.name} in order {self.order.id}"
    

    def get_subtotal(self):
        return self.product.price * self.quantity
    


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
    
    
class SuppierAds(models.Model):
    supplier = models.ForeignKey(Supplier,on_delete=models.CASCADE,related_name='supplier_ads')
    title = models.CharField(max_length=200,null=True,blank=True)
    description = models.TextField(max_length=1000,null=True,blank=True)
    image = models.ImageField(upload_to="ads_image")
    created_by = models.ForeignKey(User,on_delete=models.CASCADE,related_name='supplier_ads')
    created_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)
    
    
    def __str__(self):
        return str(self.supplier) + " | " + str(self.title)
    




COUNTRY_CHO=[('Yemen','Yemen')]

