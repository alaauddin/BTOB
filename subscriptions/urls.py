from django.urls import path
from . import views

app_name = 'subscriptions'

urlpatterns = [
    path('plans/', views.SubscriptionPlanListAPIView.as_view(), name='plan_list'),
    path('status/', views.MerchantSubscriptionAPIView.as_view(), name='status'),
    path('subscribe/', views.SubscribeAPIView.as_view(), name='subscribe'),
    path('payment-methods/', views.PaymentMethodsAPIView.as_view(), name='payment_methods'),
    path('submit-payment/', views.SubmitSubscriptionPaymentAPIView.as_view(), name='submit_payment'),
]
