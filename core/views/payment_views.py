from django.shortcuts import render, get_object_or_404, redirect
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.http import JsonResponse
from core.models import Supplier, SupplierPaymentMethod, PaymentTransaction, Order, OrderStatus
from core.forms import SupplierPaymentMethodForm
from core.utils.merchant_utils import get_active_supplier

@login_required
def manage_payment_methods(request):
    """View for suppliers to manage their payment methods."""
    supplier = get_active_supplier(request)
    if not supplier:
        messages.error(request, 'Access denied.')
        return redirect('suppliers_list')
    
    payment_methods = supplier.payment_methods.all().select_related('payment_method')
    
    if request.method == 'POST':
        form = SupplierPaymentMethodForm(request.POST)
        if form.is_valid():
            spm = form.save(commit=False)
            spm.supplier = supplier
            spm.save()
            messages.success(request, 'Payment method added successfully.')
            return redirect('manage_payment_methods')
    else:
        form = SupplierPaymentMethodForm()
        
    return render(request, 'supplier_payment_methods.html', {
        'supplier': supplier,
        'payment_methods': payment_methods,
        'form': form
    })

@login_required
def delete_payment_method(request, method_id):
    """View to delete a supplier payment method."""
    supplier = get_active_supplier(request)
    spm = get_object_or_404(SupplierPaymentMethod, id=method_id, supplier=supplier)
    spm.delete()
    messages.success(request, 'Payment method removed.')
    return redirect('manage_payment_methods')

@login_required
def submit_payment(request):
    """API for users to submit a payment receipt."""
    if request.method == 'POST':
        order_id = request.POST.get('order_id')
        spm_id = request.POST.get('supplier_payment_method_id')
        receipt = request.FILES.get('receipt')
        
        order = get_object_or_404(Order, id=order_id, user=request.user)
        spm = get_object_or_404(SupplierPaymentMethod, id=spm_id)
        
        # Validation
        if PaymentTransaction.objects.filter(order=order).exists():
             return JsonResponse({'success': False, 'message': 'Payment already submitted for this order.'}, status=400)
        
        if not receipt:
             return JsonResponse({'success': False, 'message': 'Receipt image is required.'}, status=400)

        # Create transaction
        transaction = PaymentTransaction.objects.create(
            order=order,
            user=request.user,
            supplier_payment_method=spm,
            receipt=receipt,
            status='pending'
        )
        
        return JsonResponse({'success': True, 'message': 'Payment submitted successfully. Please wait for verification.'})
    
    return JsonResponse({'success': False, 'message': 'Invalid request method.'}, status=405)

@login_required
def verify_payment(request, transaction_id):
    """Supplier view to verify/reject a payment transaction."""
    supplier = get_active_supplier(request)
    transaction = get_object_or_404(PaymentTransaction, id=transaction_id, supplier_payment_method__supplier=supplier)
    
    action = request.POST.get('action') # 'approve' or 'reject'
    
    if action == 'approve':
        transaction.status = 'verified'
        transaction.save()
        
        # Auto-confirm order
        order = transaction.order
        confirmed_status = OrderStatus.objects.filter(slug='confirmed').first()
        if confirmed_status:
            order.update_status(confirmed_status, user=request.user)
            
        msg = 'Payment verified and order confirmed.'
        msg_type = 'success'

    elif action == 'reject':
        transaction.status = 'rejected'
        transaction.save()
        msg = 'Payment rejected.'
        msg_type = 'warning'
    else:
        msg = 'Invalid action.'
        msg_type = 'error'

    if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
        return JsonResponse({'success': msg_type != 'error', 'message': msg})
    
    if msg_type == 'success':
        messages.success(request, msg)
    elif msg_type == 'warning':
        messages.warning(request, msg)
    else:
        messages.error(request, msg)

    return redirect('merchant_order_detail', order_id=transaction.order.id)
