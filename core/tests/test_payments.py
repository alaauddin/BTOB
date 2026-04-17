from django.test import TestCase, Client
from django.contrib.auth.models import User
from core.models import Supplier, SupplierCategory, Order, OrderStatus, PaymentMethod, SupplierPaymentMethod, PaymentTransaction
from django.core.files.uploadedfile import SimpleUploadedFile
from decimal import Decimal

class PaymentSystemTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='buyer', password='password')
        self.supplier_user = User.objects.create_user(username='supplier_admin', password='password')
        
        self.category = SupplierCategory.objects.create(name='Electronics')
        self.supplier = Supplier.objects.create(
            user=self.supplier_user,
            name='Test Shop',
            store_id='test-shop'
        )
        self.supplier.category.set([self.category])
        
        self.status_pending = OrderStatus.objects.create(name='Pending', slug='pending')
        
        self.order = Order.objects.create(
            user=self.user,
            total_amount=Decimal('100.00'),
            pipeline_status=self.status_pending
        )
        
        self.payment_method = PaymentMethod.objects.create(
            name='Bank Transfer',
            is_active=True
        )
        
        self.supplier_payment = SupplierPaymentMethod.objects.create(
            supplier=self.supplier,
            payment_method=self.payment_method,
            account_field_name='IBAN',
            account_field_value='YE123456789'
        )
        
        self.client = Client()

    def test_submit_payment(self):
        self.client.login(username='buyer', password='password')
        
        image = SimpleUploadedFile("receipt.jpg", b"file_content", content_type="image/jpeg")
        
        response = self.client.post('/payments/submit/', {
            'order_id': self.order.id,
            'supplier_payment_method_id': self.supplier_payment.id,
            'receipt': image
        }, HTTP_X_REQUESTED_WITH='XMLHttpRequest')
        
        self.assertEqual(response.status_code, 200)
        self.assertTrue(PaymentTransaction.objects.filter(order=self.order).exists())
        
        transaction = PaymentTransaction.objects.get(order=self.order)
        self.assertEqual(transaction.status, 'pending')

    def test_verify_payment(self):
        # Create transaction first
        image = SimpleUploadedFile("receipt.jpg", b"file_content", content_type="image/jpeg")
        transaction = PaymentTransaction.objects.create(
            order=self.order,
            user=self.user,
            supplier_payment_method=self.supplier_payment,
            receipt=image
        )
        
        # Log in as supplier
        self.client.login(username='supplier_admin', password='password')
        
        # Verify
        response = self.client.post(f'/payments/verify/{transaction.id}/', {
            'action': 'approve'
        })
        
        transaction.refresh_from_db()
        self.assertEqual(transaction.status, 'verified')
