import os
import sys
print(sys.path)
import django
from decimal import Decimal

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Project.settings')
django.setup()

from django.contrib.auth.models import User
from core.models import Supplier, Product, ProductOffer, Cart, CartItem, Order, Address
from django.utils import timezone
from core.views.CartView import CartView

def verify_pricing():
    print("Setting up test data...")
    # Create User
    user, _ = User.objects.get_or_create(username='test_pricing_user', defaults={'email': 'test@example.com'})
    
    # Create Supplier User
    supplier_user, _ = User.objects.get_or_create(username='test_supplier_user', defaults={'email': 'supplier@example.com'})

    # Create Supplier with delivery fees
    supplier, _ = Supplier.objects.get_or_create(
        store_id='test-store',
        defaults={
            'user': supplier_user,
            'name': 'Test Store',
            'phone': 123456789,
            'address': 'Test Address',
            'city': 'Sanaa',
            'country': 'Yemen',
            'latitude': Decimal('15.3694'),
            'longitude': Decimal('44.1910'),
            'enable_delivery_fees': True,
            'delivery_fee_ratio': Decimal('10.00'), # 10 currency per km
        }
    )
    supplier.enable_delivery_fees = True
    supplier.delivery_fee_ratio = Decimal('10.00')
    supplier.save()

    # Create User Address nearby (approx 1km away)
    # Roughly 0.009 degrees lat diff is ~1km
    address, _ = Address.objects.get_or_create(
        user=user,
        defaults={
            'phone': 123456,
            'address_line1': 'Nearby',
            'city': 'Sanaa',
            'country': 'Yemen',
            'address_type': 'Shipping',
            'latitude': Decimal('15.3784'), # +~0.009
            'longitude': Decimal('44.1910'),
        }
    )

    # Create Categories
    from core.models import Category, ProductCategory
    category, _ = Category.objects.get_or_create(supplier=supplier, name='Test Category')
    product_category, _ = ProductCategory.objects.get_or_create(category=category, name='Test SubCategory')

    # Create Product
    product, _ = Product.objects.get_or_create(
        name='Test Product',
        supplier=supplier,
        defaults={
            'category': product_category,
            'description': 'Test Desc',
            'price': Decimal('100.00'),
            'image': 'test.jpg'
        }
    )
    
    # Create Active Offer (20% off)
    ProductOffer.objects.filter(product=product).delete()
    offer = ProductOffer.objects.create(
        product=product,
        discount_precentage=Decimal('0.20'),
        from_date=timezone.now().date(),
        to_date=timezone.now().date() + timezone.timedelta(days=1),
        is_active=True,
        created_by=user
    )

    print(f"Product Price: {product.price}")
    print(f"Discounted Price: {product.get_price_with_offer()}") 
    
    # Clean Cart
    Cart.objects.filter(user=user).delete()
    cart = Cart.objects.create(user=user, supplier=supplier)
    cart_item = CartItem.objects.create(cart=cart, product=product, quantity=2) # 2 items

    print(f"\nVerifying Cart Calculations...")
    expected_item_total = Decimal('80.00') * 2 # 100 * 0.8 * 2 = 160
    cart_total_after_discount = cart.get_total_after_discount()
    print(f"Cart Total After Discount (Expected: 160.00): {cart_total_after_discount}")
    
    if cart_total_after_discount != Decimal('160.00'):
        print("FAILED: Cart total calculation incorrect.")
    else:
        print("PASSED: Cart total calculation correct.")

    print(f"\nVerifying Order Creation Logic (Simulating CartView)...")
    
    # Mock request and view behavior logic 
    # We can't easily mock the full view post request here without RequestFactory but we can verify the logic chunks
    
    # 1. Create Order
    order = Order.objects.create(
        user=user,
        total_amount=0 # Initial
    )
    
    # 2. Add items
    from core.models import OrderItem
    OrderItem.objects.create(order=order, product=product, quantity=cart_item.quantity)
    
    # 3. Link Address (Simulate saving address to order)
    from core.models import ShippingAddress
    shipping_addr = ShippingAddress.objects.create(
        order=order,
        phone=address.phone,
        address_line1=address.address_line1,
        city=address.city,
        country=address.country,
        address_type=address.address_type,
        latitude=address.latitude,
        longitude=address.longitude
    )
    
    # 4. Trigger set_total_amount (The FIX)
    order.set_total_amount()
    
    print(f"Order Total Amount: {order.total_amount}")
    
    # Expected: 160 (Items) + Delivery Fee
    # Distance approx 1km -> Fee approx 10
    expected_fee = order.get_expected_delivery_fee()
    print(f"Expected Delivery Fee: {expected_fee}")
    
    expected_grand_total = Decimal('160.00') + expected_fee
    
    if abs(order.total_amount - expected_grand_total) < Decimal('0.01'):
         print("PASSED: Order total_amount includes discounts and delivery fees correctly.")
    else:
         print(f"FAILED: Order total_amount {order.total_amount} != Expected {expected_grand_total}")
         
    # Verify get_total_amount EXCLUDES delivery fee (Updated Logic)
    # Gross Total = 2 items * 100.00 = 200.00 (Before Discount)
    expected_gross_total = Decimal('200.00')
    if order.get_total_amount() == expected_gross_total:
         print("PASSED: Order.get_total_amount() correctly excludes delivery fee and returns Gross Total.")
    else:
         print(f"FAILED: Order.get_total_amount() {order.get_total_amount()} != Expected Gross {expected_gross_total}")

if __name__ == '__main__':
    try:
        verify_pricing()
    except Exception as e:
        print(f"Error during verification: {e}")
