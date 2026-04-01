from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from django.shortcuts import get_object_or_404
from core.models import DeliveryDriver, Order, DriverLocation
from ..serializers import (
    DeliveryDriverMiniSerializer, DriverOrderSerializer, 
    DriverLocationSerializer
)

class DriverDashboardAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        driver = DeliveryDriver.objects.filter(user=request.user, is_active=True).select_related('supplier').first()
        if not driver:
            return Response({'success': False, 'message': 'Account not registered as a delivery driver.'}, status=status.HTTP_403_FORBIDDEN)

        status_filter = request.query_params.get('status', 'active')
        
        # Get all orders assigned to this driver
        assigned_orders = Order.objects.filter(
            delivery_driver=driver
        ).select_related(
            'user', 'pipeline_status'
        ).prefetch_related(
            'order_items__product',
            'shippingaddress_set'
        ).order_by('-created_at')

        # Filter by status tab
        if status_filter == 'active':
            assigned_orders = assigned_orders.exclude(
                pipeline_status__slug__in=['delivered', 'cancelled']
            )
        elif status_filter == 'delivered':
            assigned_orders = assigned_orders.filter(pipeline_status__slug='delivered')

        # Get counts for tabs
        stats = {
            'active_count': Order.objects.filter(delivery_driver=driver).exclude(
                pipeline_status__slug__in=['delivered', 'cancelled']
            ).count(),
            'delivered_count': Order.objects.filter(
                delivery_driver=driver, pipeline_status__slug='delivered'
            ).count(),
            'total_count': Order.objects.filter(delivery_driver=driver).count(),
        }

        return Response({
            'success': True,
            'driver': DeliveryDriverMiniSerializer(driver, context={'request': request}).data,
            'stats': stats,
            'orders': DriverOrderSerializer(assigned_orders, many=True, context={'request': request}).data,
        })

class DriverUpdateStatusAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, order_id):
        driver = DeliveryDriver.objects.filter(user=request.user, is_active=True).first()
        if not driver:
            return Response({'success': False, 'message': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)

        order = get_object_or_404(Order, id=order_id, delivery_driver=driver)
        
        success, message = order.move_to_next_status()
        if not success:
            return Response({'success': False, 'message': message}, status=status.HTTP_400_BAD_REQUEST)

        order.refresh_from_db()
        return Response({
            'success': True,
            'message': message,
            'order': DriverOrderSerializer(order, context={'request': request}).data
        })

class DriverLocationUpdateAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        driver = DeliveryDriver.objects.filter(user=request.user, is_active=True).first()
        if not driver:
            return Response({'success': False, 'message': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)

        serializer = DriverLocationSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(driver=driver)
            return Response({'success': True, 'message': 'Location updated'})
        return Response({'success': False, 'errors': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)
