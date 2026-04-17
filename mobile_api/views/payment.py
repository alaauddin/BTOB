from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import action
from django.shortcuts import get_object_or_404

from core.models import PaymentMethod, SupplierPaymentMethod, PaymentTransaction
from ..serializers.payment import (
    PaymentMethodSerializer, SupplierPaymentMethodSerializer, PaymentTransactionSerializer
)
from .helpers import _assert_merchant_access

class GlobalPaymentMethodViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Viewset for customers and merchants to view available global payment methods.
    """
    queryset = PaymentMethod.objects.filter(is_active=True).order_by('name')
    serializer_class = PaymentMethodSerializer
    permission_classes = [permissions.IsAuthenticated]

from ..serializers.merchant import MerchantOrderSerializer

class MerchantPaymentMethodViewSet(viewsets.ModelViewSet):
    """
    Viewset for merchants to manage their active payment providers and account info.
    """
    serializer_class = SupplierPaymentMethodSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Securely filter queryset based on merchants the user can manage
        from .helpers import _get_manageable_merchants
        manageable_ids = _get_manageable_merchants(self.request.user).values_list('id', flat=True)
        base_qs = SupplierPaymentMethod.objects.filter(supplier_id__in=manageable_ids)

        if self.action in ['retrieve', 'update', 'partial_update', 'destroy']:
            return base_qs
        
        merchant_id = self.request.query_params.get('merchant_id')
        if not merchant_id:
            return SupplierPaymentMethod.objects.none()
        return base_qs.filter(supplier_id=merchant_id)

    def perform_create(self, serializer):
        merchant_id = self.request.data.get('merchant_id')
        supplier, err = _assert_merchant_access(self.request.user, merchant_id)
        if err:
            return
        serializer.save(supplier=supplier)

    @action(detail=False, methods=['POST'])
    def verify_transaction(self, request):
        """
        Endpoint for merchants to verify/reject a payment transaction.
        """
        merchant_id = request.data.get('merchant_id')
        transaction_id = request.data.get('transaction_id')
        action_type = request.data.get('action') # 'verify' or 'reject'
        notes = request.data.get('notes', '')

        # Map mobile action to backend status
        status_map = {'verify': 'verified', 'reject': 'rejected'}
        new_status = status_map.get(action_type)

        if not new_status:
            return Response({'success': False, 'message': 'Invalid action'}, status=status.HTTP_400_BAD_REQUEST)

        transaction = get_object_or_404(PaymentTransaction, id=transaction_id)
        supplier, err = _assert_merchant_access(request.user, merchant_id)
        if err: return err

        if transaction.order.get_supplier() != supplier:
            return Response({'success': False, 'message': 'No access to this transaction'}, status=status.HTTP_403_FORBIDDEN)

        transaction.status = new_status
        transaction.verification_notes = notes
        transaction.save()

        if new_status == 'verified':
            order = transaction.order
            from core.models import OrderStatus
            confirmed_status = OrderStatus.objects.filter(slug='confirmed').first()
            if confirmed_status:
                order.update_status(confirmed_status, user=request.user)

        return Response({
            'success': True, 
            'message': f'Transaction {new_status} successfully',
            'transaction': PaymentTransactionSerializer(transaction, context={'request': request}).data,
            'order': MerchantOrderSerializer(transaction.order, context={'request': request}).data
        })

from rest_framework.views import APIView

class MerchantVerifyPaymentAPIView(APIView):
    """
    Dedicated API view for merchants to verify/reject a payment transaction.
    Mirrors the logic in core but optimized for mobile DRF usage.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        merchant_id = request.data.get('merchant_id')
        transaction_id = request.data.get('transaction_id')
        action_type = request.data.get('action') # 'approve' or 'reject' (maps to 'verify'/'reject' in helper)
        notes = request.data.get('notes', '')

        # Standardize action names
        if action_type == 'approve': action_type = 'verify'

        # Reuse the ViewSet logic for consistency
        viewset = MerchantPaymentMethodViewSet()
        # Mocking necessary parts if needed, but easier to just duplicate the logic here for clarity
        # OR better yet, move logic to a service layer. But for now, duplication is safer.
        
        status_map = {'verify': 'verified', 'reject': 'rejected'}
        new_status = status_map.get(action_type)

        if not new_status:
            return Response({'success': False, 'message': 'Invalid action'}, status=status.HTTP_400_BAD_REQUEST)

        transaction = get_object_or_404(PaymentTransaction, id=transaction_id)
        supplier, err = _assert_merchant_access(request.user, merchant_id)
        if err: return err

        if transaction.order.get_supplier() != supplier:
            return Response({'success': False, 'message': 'No access to this transaction'}, status=status.HTTP_403_FORBIDDEN)

        transaction.status = new_status
        transaction.verification_notes = notes
        transaction.save()

        if new_status == 'verified':
            order = transaction.order
            from core.models import OrderStatus
            confirmed_status = OrderStatus.objects.filter(slug='confirmed').first()
            if confirmed_status:
                order.update_status(confirmed_status, user=request.user)

        return Response({
            'success': True, 
            'message': f'Transaction {new_status} successfully',
            'transaction': PaymentTransactionSerializer(transaction, context={'request': request}).data,
            'order': MerchantOrderSerializer(transaction.order, context={'request': request}).data
        })

