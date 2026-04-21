from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from django.utils import timezone
from .models import Plan, Subscription, SubscriptionPaymentMethod, SubscriptionPayment
from .serializers import (
    PlanSerializer, SubscriptionSerializer, 
    SubscriptionPaymentMethodSerializer, SubscriptionPaymentSerializer
)
from core.db.supplier import Supplier

class SubscriptionPlanListAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        plans = Plan.objects.filter(is_active=True).order_by('price')
        return Response({
            'success': True,
            'plans': PlanSerializer(plans, many=True).data
        })

class MerchantSubscriptionAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        merchant_id = request.query_params.get('merchant_id')
        if not merchant_id:
            return Response({'success': False, 'message': 'merchant_id required'}, status=400)
        
        supplier = Supplier.objects.filter(id=merchant_id, user=request.user).first()
        if not supplier:
            return Response({'success': False, 'message': 'Unauthorized'}, status=403)

        # Get active or pending subscription
        sub = Subscription.objects.filter(supplier=supplier).order_by('-end_date').first()
        
        return Response({
            'success': True,
            'subscription': SubscriptionSerializer(sub).data if sub else None,
            'is_subscribed': sub.is_active() if sub else False
        })

class SubscribeAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        merchant_id = request.data.get('merchant_id')
        plan_id = request.data.get('plan_id')
        
        if not merchant_id or not plan_id:
            return Response({'success': False, 'message': 'Missing fields'}, status=400)

        from django.db.models import Q
        if request.user.is_superuser:
            supplier = Supplier.objects.filter(id=merchant_id).first()
        else:
            supplier = Supplier.objects.filter(
                Q(user=request.user) | Q(managing_users=request.user),
                id=merchant_id
            ).first()
        
        plan = Plan.objects.filter(id=plan_id, is_active=True).first()

        if not supplier or not plan:
            return Response({'success': False, 'message': 'Invalid supplier or plan'}, status=400)

        # Check if already has active subscription of same plan
        existing = Subscription.objects.filter(supplier=supplier, plan=plan, status='active', end_date__gt=timezone.now()).first()
        if existing:
            return Response({'success': False, 'message': 'Already subscribed to this plan'}, status=400)

        # Create pending subscription
        start_date = timezone.now()
        end_date = start_date + timezone.timedelta(days=plan.duration_days)
        
        sub = Subscription.objects.create(
            supplier=supplier,
            plan=plan,
            start_date=start_date,
            end_date=end_date,
            status='pending'
        )

        return Response({
            'success': True,
            'message': 'Subscription initiated. Please proceed to payment.',
            'subscription': SubscriptionSerializer(sub).data
        })

class PaymentMethodsAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        methods = SubscriptionPaymentMethod.objects.filter(is_active=True)
        return Response({
            'success': True,
            'methods': SubscriptionPaymentMethodSerializer(methods, many=True, context={'request': request}).data
        })

class SubmitSubscriptionPaymentAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        subscription_id = request.data.get('subscription_id')
        method_id = request.data.get('method_id')
        submitted_data = request.data.get('submitted_data', '{}') # JSON string or dict
        receipt = request.FILES.get('receipt')

        import json
        if isinstance(submitted_data, str):
            try:
                submitted_data = json.loads(submitted_data)
            except:
                submitted_data = {}

        from django.db.models import Q
        sub = Subscription.objects.filter(
            Q(supplier__user=request.user) | Q(supplier__managing_users=request.user),
            id=subscription_id
        ).first()
        method = SubscriptionPaymentMethod.objects.filter(id=method_id, is_active=True).first()

        if not sub or not method:
            return Response({'success': False, 'message': 'Invalid subscription or method'}, status=400)

        payment = SubscriptionPayment.objects.create(
            subscription=sub,
            payment_method=method,
            amount=sub.plan.price,
            submitted_data=submitted_data,
            receipt_image=receipt,
            status='pending'
        )

        return Response({
            'success': True,
            'message': 'Payment submitted for review.',
            'payment': SubscriptionPaymentSerializer(payment).data
        })
