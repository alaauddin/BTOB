from django.contrib import admin
from django.utils.html import format_html
from django.urls import path
from django.shortcuts import redirect
from .models import Plan, PlanFeature, Subscription, SubscriptionPaymentMethod, PaymentMethodField, SubscriptionPayment

class PlanFeatureInline(admin.TabularInline):
    model = PlanFeature
    extra = 3

class PaymentMethodFieldInline(admin.TabularInline):
    model = PaymentMethodField
    extra = 1

@admin.register(Plan)
class PlanAdmin(admin.ModelAdmin):
    list_display = ('name', 'price', 'duration_days', 'is_active')
    list_filter = ('is_active',)
    inlines = [PlanFeatureInline]

@admin.register(Subscription)
class SubscriptionAdmin(admin.ModelAdmin):
    list_display = ('supplier', 'plan', 'start_date', 'end_date', 'status')
    list_filter = ('status', 'plan')
    search_fields = ('supplier__name',)

@admin.register(SubscriptionPaymentMethod)
class SubscriptionPaymentMethodAdmin(admin.ModelAdmin):
    list_display = ('name', 'is_active')
    inlines = [PaymentMethodFieldInline]

@admin.register(SubscriptionPayment)
class SubscriptionPaymentAdmin(admin.ModelAdmin):
    change_form_template = 'admin/subscriptions/subscriptionpayment/change_form.html'
    list_display = ('subscription', 'amount', 'payment_method', 'status', 'created_at')
    list_filter = ('status', 'payment_method')
    readonly_fields = ('submitted_data',)
    actions = ['approve_payment', 'reject_payment']

    def get_urls(self):
        urls = super().get_urls()
        custom_urls = [
            path(
                '<int:payment_id>/approve/',
                self.admin_site.admin_view(self.approve_payment_detail),
                name='payment-approve',
            ),
            path(
                '<int:payment_id>/reject/',
                self.admin_site.admin_view(self.reject_payment_detail),
                name='payment-reject',
            ),
        ]
        return custom_urls + urls

    def approve_payment_detail(self, request, payment_id):
        payment = self.get_object(request, payment_id)
        if payment and payment.status == 'pending':
            payment.status = 'completed'
            payment.save()
            sub = payment.subscription
            sub.status = 'active'
            sub.save()
            self.message_user(request, "تم اعتماد الدفع وتفعيل الاشتراك بنجاح.")
        from django.urls import reverse
        return redirect(reverse('admin:subscriptions_subscriptionpayment_change', args=[payment_id]))

    def reject_payment_detail(self, request, payment_id):
        payment = self.get_object(request, payment_id)
        if payment and payment.status == 'pending':
            payment.status = 'failed'
            payment.save()
            self.message_user(request, "تم رفض الدفع.")
        from django.urls import reverse
        return redirect(reverse('admin:subscriptions_subscriptionpayment_change', args=[payment_id]))

    @admin.action(description="اعتماد الدفع وتفعيل الاشتراك")
    def approve_payment(self, request, queryset):
        count = 0
        for payment in queryset.filter(status='pending'):
            # Mark payment as completed
            payment.status = 'completed'
            payment.save()
            
            # Activate the subscription
            sub = payment.subscription
            sub.status = 'active'
            sub.save()
            count += 1
        
        self.message_user(request, f"تم اعتماد {count} دفعات وتفعيل الاشتراكات الخاصة بها بنجاح.")

    @admin.action(description="رفض الدفع")
    def reject_payment(self, request, queryset):
        updated = queryset.filter(status='pending').update(status='failed')
        self.message_user(request, f"تم رفض {updated} دفعات.")
