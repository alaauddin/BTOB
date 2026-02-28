from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required
from core.models import Supplier
import logging

logger = logging.getLogger("core.views.merchant_selection")

@login_required
def select_merchant(request):
    if request.method == 'POST':
        supplier_id = request.POST.get('supplier_id')
        if supplier_id:
            supplier = Supplier.objects.filter(id=supplier_id).first()
            if supplier:
                is_owner = getattr(supplier, 'user', None) == request.user
                is_manager = supplier.managing_users.filter(id=request.user.id).exists()
                
                if request.user.is_superuser or is_owner or is_manager:
                    request.session['active_supplier_id'] = supplier.id
                    logger.info(f"User {request.user} selected merchant {supplier.name}")
                    return redirect('my_merchant')
    
    # Get all available suppliers for the user
    logger.info(f"User {request.user} (is_superuser: {request.user.is_superuser}) is accessing merchant selection")
    
    # Get stores where user is owner
    owned_suppliers = list(Supplier.objects.filter(user=request.user))
    
    # Get stores where user is manager
    managed_suppliers = list(request.user.managed_suppliers.all())
    
    logger.debug(f"Owned stores: {[s.name for s in owned_suppliers]}, Managed stores: {[s.name for s in managed_suppliers]}")
    
    all_suppliers = []
    for s in owned_suppliers:
        if s not in all_suppliers:
            all_suppliers.append(s)
    for s in managed_suppliers:
        if s not in all_suppliers:
            all_suppliers.append(s)
    
    logger.info(f"Total Suppliers Found for user {request.user}: {len(all_suppliers)}")
    
    # If no stores found, and naturally they aren't owner or manager
    if not all_suppliers:
        # For superusers, they might want to see the page but it will be empty if not related to any
        if request.user.is_superuser:
            return render(request, 'merchant_selection.html', {'suppliers': []})
        logger.warning(f"No suppliers found for user {request.user}, redirecting to join_business")
        return redirect('join_business')
        
    return render(request, 'merchant_selection.html', {
        'suppliers': all_suppliers
    })
