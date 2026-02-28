from django.shortcuts import redirect
from django.contrib import messages
from django.contrib.auth.mixins import AccessMixin
from django.core.exceptions import PermissionDenied
from django.http import JsonResponse
from functools import wraps
from core.models import Supplier
from core.utils.merchant_utils import get_active_supplier
import logging

logger = logging.getLogger("core.decorators")

def merchant_required(view_func):
    """
    Decorator to ensure the user is an authenticated merchant (Supplier) or a managing user.
    """
    @wraps(view_func)
    def _wrapped_view(request, *args, **kwargs):
        if not request.user.is_authenticated:
            return redirect('merchant_login')

        # Check if user is superuser (always allowed)
        # Note: Superuser might need a 'supplier_id' param to mock a merchant, 
        # but for access control, we allow them to enter.
        # However, the view itself must handle getting the supplier instance.
        if request.user.is_superuser:
            logger.info(f"Superuser {request.user} allowed access to {view_func.__name__}")
            return view_func(request, *args, **kwargs)

        # Check if user has an active supplier context
        supplier = get_active_supplier(request)
        
        if not supplier:
            logger.warning(f"Access denied to {view_func.__name__} for user {request.user}: No active supplier context found")
            # Not a supplier
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return JsonResponse({
                    'success': False, 
                    'message': 'يجب أن تكون مورداً مسجلاً للقيام بهذا الإجراء'
                }, status=403)
            
            messages.warning(request, "يجب عليك التسجيل كتاجر للوصول إلى هذه الصفحة.")
            return redirect('join_business')
            
        logger.debug(f"User {request.user} allowed access to {view_func.__name__} for supplier {supplier.name}")
        return view_func(request, *args, **kwargs)
    return _wrapped_view
