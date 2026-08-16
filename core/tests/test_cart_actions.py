from django.test import TestCase, Client
from django.contrib.auth import get_user_model
from core.models import Supplier, Product, ProductCategory, Category, Cart, CartItem, ProductAttribute, ProductAttributeOption, Currency
import json

User = get_user_model()

class CartActionsTestCase(TestCase):
    def setUp(self):
        self.client = Client()
        self.user = User.objects.create_user(
            username='cartuser',
            password='testpassword123'
        )
        self.owner = User.objects.create_user(
            username='merchantowner',
            password='testpassword123'
        )
        self.currency, _ = Currency.objects.get_or_create(
            code='YER',
            defaults={'name': 'Yemeni Rial', 'symbol': 'YER'}
        )
        self.supplier = Supplier.objects.create(
            user=self.owner,
            name='Wateen Al Oud',
            store_id='wateen-al-oud',
            subdomain='wateen-al-oud',
            currency=self.currency
        )
        self.main_category = Category.objects.create(name='Main Perfumes')
        self.category = ProductCategory.objects.create(name='Perfumes', category=self.main_category)
        self.simple_product = Product.objects.create(
            name='Musk Oud',
            price=1500,
            stock=10,
            supplier=self.supplier,
            category=self.category
        )
        self.var_product = Product.objects.create(
            name='Royal Amber',
            price=3000,
            stock=10,
            supplier=self.supplier,
            category=self.category
        )
        self.attr = ProductAttribute.objects.create(
            product=self.var_product,
            name='Size'
        )
        self.opt_small = ProductAttributeOption.objects.create(
            attribute=self.attr,
            value='50ml',
            price_modifier=0
        )
        self.opt_large = ProductAttributeOption.objects.create(
            attribute=self.attr,
            value='100ml',
            price_modifier=500
        )

    def test_add_and_sub_simple_product_to_cart(self):
        self.client.force_login(self.user)
        
        # Add simple product
        response = self.client.post(
            f'/add_to_cart/{self.simple_product.id}/{self.supplier.store_id}/',
            data=json.dumps({'selected_options': [], 'quantity': 1}),
            content_type='application/json',
            HTTP_X_REQUESTED_WITH='XMLHttpRequest'
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data['success'])
        self.assertEqual(data['cart_item_count'], 1)
        self.assertEqual(data['cart_items_count'], 1)

        # Subtract simple product
        response = self.client.post(
            f'/sub_to_cart/{self.simple_product.id}/{self.supplier.store_id}/',
            data=json.dumps({'selected_options': []}),
            content_type='application/json',
            HTTP_X_REQUESTED_WITH='XMLHttpRequest'
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data['success'])
        self.assertEqual(data['cart_item_count'], 0)
        self.assertEqual(data['cart_items_count'], 0)

    def test_add_variation_product_to_cart(self):
        self.client.force_login(self.user)
        
        # Add variation product without options should fail
        response = self.client.post(
            f'/add_to_cart/{self.var_product.id}/{self.supplier.store_id}/',
            data=json.dumps({'selected_options': [], 'quantity': 1}),
            content_type='application/json',
            HTTP_X_REQUESTED_WITH='XMLHttpRequest'
        )
        self.assertEqual(response.status_code, 400)

        # Add variation product with valid option
        response = self.client.post(
            f'/add_to_cart/{self.var_product.id}/{self.supplier.store_id}/',
            data=json.dumps({'selected_options': [self.opt_large.id], 'quantity': 1}),
            content_type='application/json',
            HTTP_X_REQUESTED_WITH='XMLHttpRequest'
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data['success'])
        self.assertEqual(data['cart_item_count'], 1)
        self.assertEqual(data['cart_items_count'], 1)
