from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from core.models import Order, Address, ShippingAddress
from django.contrib import messages

@login_required
def profile_view(request):
    """
    Renders the professional User Profile page with personal stats and account management.
    """
    user = request.user
    
    # Fetch user stats
    total_orders = Order.objects.filter(user=user).count()
    active_orders = Order.objects.filter(
        user=user, 
        pipeline_status__slug__in=['pending', 'confirmed', 'processing', 'shipped', 'out_for_delivery']
    ).count()
    
    context = {
        'user': user,
        'total_orders': total_orders,
        'active_orders': active_orders,
        'profile_active': True,  # For bottom nav highlight
    }
    
    return render(request, 'profile.html', context)

@login_required
def address_list_view(request):
    """
    Renders a list of saved and past shipping addresses.
    """
    user = request.user
    
    # Primary address from Address model
    primary_address = Address.objects.filter(user=user).first()
    
    # Past unique addresses from ShippingAddress model (linked to user orders)
    past_addresses = ShippingAddress.objects.filter(order__user=user).order_by('-id')
    
    # Unique addresses comparison logic - avoiding duplicates
    unique_past = []
    seen = set()
    if primary_address:
        seen.add((primary_address.address_line1, primary_address.city))
        
    for addr in past_addresses:
        key = (addr.address_line1, addr.city)
        if key not in seen:
            unique_past.append(addr)
            seen.add(key)
    
    context = {
        'primary_address': primary_address,
        'past_addresses': unique_past,
        'profile_active': True,
    }
    return render(request, 'address_list.html', context)

@login_required
def set_current_address(request, pk):
    """
    Promotes a past ShippingAddress to the primary Address.
    """
    past_addr = get_object_or_404(ShippingAddress, pk=pk, order__user=request.user)
    
    # Update or create primary Address
    address, created = Address.objects.get_or_create(user=request.user)
    address.phone = past_addr.phone
    address.address_line1 = past_addr.address_line1
    address.address_line2 = past_addr.address_line2
    address.city = past_addr.city
    address.country = past_addr.country
    address.postal_code = past_addr.postal_code
    address.address_type = past_addr.address_type
    address.latitude = past_addr.latitude
    address.longitude = past_addr.longitude
    address.save()
    
    messages.success(request, 'تم تحديث عنوان التوصيل الرئيسي بنجاح')
    return redirect('address_list')
