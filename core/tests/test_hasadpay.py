import json
import hmac
import hashlib
from decimal import Decimal
from unittest.mock import patch, MagicMock

from django.test import TestCase, Client
from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone

from core.models import (
    Supplier,
    Product,
    Category,
    ProductCategory,
    Cart,
    CartItem,
    Order,
    OrderItem,
    OrderStatus,
    OrderPaymentReference,
    PaymentMethod,
    SupplierPaymentMethod,
    SupplierHasadPayConfig,
    HasadPayTransaction,
    Currency,
    SystemSettings,
)
from core.views.hasadpay_views import create_hasadpay_checkout_session

User = get_user_model()


class HasadPayIntegrationTestCase(TestCase):
    def setUp(self):
        self.client = Client()

        self.system_settings = SystemSettings.objects.create(
            site_name='Rawaage E-Commerce',
            whatsapp_number='967779923330'
        )

        # Users
        self.owner = User.objects.create_user(
            username='merchantowner_hp',
            password='testpassword123'
        )
        self.buyer = User.objects.create_user(
            username='buyer_hp',
            password='testpassword123'
        )

        # Currency & Supplier
        self.currency, _ = Currency.objects.get_or_create(
            code='YER',
            defaults={'name': 'Yemeni Rial', 'symbol': 'YER'}
        )
        self.supplier = Supplier.objects.create(
            user=self.owner,
            name='Al-Fakher Perfumes',
            store_id='al-fakher',
            subdomain='al-fakher',
            currency=self.currency,
            phone='779900112'
        )

        # HasadPay Configuration for Supplier
        self.webhook_secret = "whsec_test_secret_key_12345"
        self.config = SupplierHasadPayConfig.objects.create(
            supplier=self.supplier,
            is_enabled=True,
            api_key="sec_test_dummy_key_abc",
            entity_id="entity-1234-5678",
            webhook_secret=self.webhook_secret,
            environment='sandbox',
            display_name='حصاد باي - الدفع الإلكتروني المباشر',
            auto_confirm_order=True,
        )

        # Order Statuses
        self.pending_status, _ = OrderStatus.objects.get_or_create(
            slug='pending',
            defaults={'name': 'قيد الانتظار'}
        )
        self.confirmed_status, _ = OrderStatus.objects.get_or_create(
            slug='confirmed',
            defaults={'name': 'مؤكد'}
        )

        # Category & Product
        self.main_cat = Category.objects.create(name='Fragrances')
        self.prod_cat = ProductCategory.objects.create(name='Oud', category=self.main_cat)
        self.product = Product.objects.create(
            name='Royal Amber Oud',
            price=Decimal('5000.00'),
            stock=20,
            supplier=self.supplier,
            category=self.prod_cat
        )

    def test_hasadpay_config_client_initialization(self):
        """Test that get_client initializes HasadPayClient properly."""
        client_instance = self.config.get_client()
        self.assertIsNotNone(client_instance)
        self.assertEqual(client_instance.config.api_key, "sec_test_dummy_key_abc")
        self.assertEqual(client_instance.config.entity_id, "entity-1234-5678")
        self.assertEqual(client_instance.config.webhook_secret, self.webhook_secret)

    @patch('hasadpay.TransactionsService.create')
    def test_create_hasadpay_checkout_session(self, mock_tx_create):
        """Test creating a transaction session for an order."""
        # Create an Order
        order = Order.objects.create(
            user=self.buyer,
            total_amount=Decimal('5000.00'),
            pipeline_status=self.pending_status
        )

        # Mock transaction response
        mock_response = MagicMock()
        mock_response.id = 9988
        mock_response.uuid = 'e4b2d5a1-7c3e-4b9d-a8f1-3d7b8e9a2c10'
        mock_response.checkout_url = 'https://sandbox.hasadpay.com/checkout/?id=e4b2d5a1-7c3e-4b9d-a8f1-3d7b8e9a2c10'
        mock_response.status = '1'
        mock_response.status_code = '100'
        mock_response.status_display = 'In Progress'
        mock_tx_create.return_value = mock_response

        # Call helper
        request = MagicMock()
        request.user = self.buyer
        request.build_absolute_uri.return_value = f"https://rawaage.com/payments/hasadpay/callback/{order.id}/"

        checkout_url = create_hasadpay_checkout_session(request, order, self.supplier)

        self.assertEqual(checkout_url, mock_response.checkout_url)
        
        # Verify HasadPayTransaction DB record
        tx = HasadPayTransaction.objects.get(order=order)
        self.assertEqual(tx.transaction_id, '9988')
        self.assertEqual(tx.transaction_uuid, 'e4b2d5a1-7c3e-4b9d-a8f1-3d7b8e9a2c10')
        self.assertEqual(tx.status, 'pending')
        self.assertEqual(tx.amount, Decimal('5000.00'))

    @patch('hasadpay.TransactionsService.get')
    def test_hasadpay_return_callback_success(self, mock_tx_get):
        """Test customer return callback when payment is successful."""
        order = Order.objects.create(
            user=self.buyer,
            total_amount=Decimal('5000.00'),
            pipeline_status=self.pending_status
        )
        OrderItem.objects.create(
            order=order,
            product=self.product,
            quantity=1,
            price=Decimal('5000.00')
        )
        HasadPayTransaction.objects.create(
            order=order,
            supplier=self.supplier,
            transaction_id='1001',
            transaction_uuid='uuid-1001',
            amount=Decimal('5000.00'),
            status='pending'
        )

        mock_status = MagicMock()
        mock_status.is_successful = True
        mock_status.is_failed = False
        mock_status.id = 1001
        mock_status.status_code = '000.000.000'
        mock_status.status_display = 'Success'
        mock_status.service = 'FLOOSAK'
        mock_status.service_name = 'Floosak (Kuraimi)'
        mock_tx_get.return_value = mock_status

        self.client.force_login(self.buyer)
        response = self.client.get(reverse('hasadpay_return_callback', kwargs={'order_id': order.id}))

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "تم الدفع بنجاح")

        # Verify DB updates
        order.refresh_from_db()
        tx = HasadPayTransaction.objects.get(order=order)
        self.assertEqual(tx.status, 'paid')
        self.assertEqual(tx.service, 'FLOOSAK')
        self.assertEqual(order.pipeline_status, self.confirmed_status)
        self.assertTrue(OrderPaymentReference.objects.filter(order=order).exists())

    def test_hasadpay_webhook_signature_verification_and_order_confirmation(self):
        """Test webhook processing with valid HMAC-SHA256 signature."""
        order = Order.objects.create(
            user=self.buyer,
            total_amount=Decimal('5000.00'),
            pipeline_status=self.pending_status
        )
        tx = HasadPayTransaction.objects.create(
            order=order,
            supplier=self.supplier,
            transaction_id='8877',
            transaction_uuid='uuid-8877',
            amount=Decimal('5000.00'),
            status='pending'
        )

        payload_dict = {
            "id": 8877,
            "event": "payment.succeeded",
            "merchant_reference": f"ORD-{order.id}",
            "amount": "5000.00",
            "currency": "YER",
            "payment_brand": "Floosak",
            "status": "2"
        }
        payload_bytes = json.dumps(payload_dict).encode('utf-8')

        # Generate HMAC-SHA256 signature
        signature = hmac.new(
            self.webhook_secret.encode('utf-8'),
            payload_bytes,
            hashlib.sha256
        ).hexdigest()

        # Send webhook request
        webhook_url = reverse('hasadpay_store_webhook', kwargs={'store_id': self.supplier.store_id})
        response = self.client.post(
            webhook_url,
            data=payload_bytes,
            content_type='application/json',
            HTTP_X_HASADPAY_SIGNATURE=signature
        )

        self.assertEqual(response.status_code, 200)
        resp_json = response.json()
        self.assertEqual(resp_json['status'], 'success')
        self.assertEqual(resp_json['order_id'], order.id)

        # Verify DB updates
        order.refresh_from_db()
        tx.refresh_from_db()
        self.assertEqual(tx.status, 'paid')
        self.assertEqual(order.pipeline_status, self.confirmed_status)
        self.assertTrue(OrderPaymentReference.objects.filter(order=order).exists())

    def test_hasadpay_webhook_invalid_signature_rejected(self):
        """Test that a forged webhook signature is rejected with 400 Bad Request."""
        payload_dict = {
            "id": 9999,
            "event": "payment.succeeded",
            "merchant_reference": "ORD-9999",
            "amount": "5000.00",
        }
        payload_bytes = json.dumps(payload_dict).encode('utf-8')
        forged_signature = "invalid_tampered_signature_hex"

        webhook_url = reverse('hasadpay_store_webhook', kwargs={'store_id': self.supplier.store_id})
        response = self.client.post(
            webhook_url,
            data=payload_bytes,
            content_type='application/json',
            HTTP_X_HASADPAY_SIGNATURE=forged_signature
        )

        self.assertEqual(response.status_code, 400)
