from core.models import Supplier
import logging

logger = logging.getLogger("core.utils.merchant_utils")

def get_active_supplier(request):
    """
    Get the active supplier for the current request.
    Priority:
    1. Superuser specific supplier_id from GET/POST
    2. Session active_supplier_id
    3. User's own supplier
    4. User's first managed supplier
    """
    if not request.user.is_authenticated:
        return None

    # For superusers checking out a specific supplier
    if request.user.is_superuser:
        supplier_id = request.POST.get('supplier_id') or request.GET.get('supplier_id')
        if supplier_id:
            supplier = Supplier.objects.filter(id=supplier_id).first()
            if supplier:
                logger.info(f"Superuser {request.user} override: active_supplier set to {supplier.name} via request param")
                return supplier

    # Check session
    active_supplier_id = request.session.get('active_supplier_id')
    if active_supplier_id:
        supplier = Supplier.objects.filter(id=active_supplier_id).first()
        if supplier:
            is_owner = getattr(supplier, 'user', None) == request.user
            is_manager = supplier.managing_users.filter(id=request.user.id).exists()
            if request.user.is_superuser or is_owner or is_manager:
                logger.debug(f"Active supplier {supplier.name} resolved from session for user {request.user}")
                return supplier

    try:
        if hasattr(request.user, 'supplier') and request.user.supplier:
            logger.debug(f"Active supplier {request.user.supplier.name} resolved from user ownership")
            return request.user.supplier
    except Supplier.DoesNotExist:
        pass
    except AttributeError:
        pass

    # Fallback to first managed supplier
    managed_supplier = request.user.managed_suppliers.first()
    if managed_supplier:
        logger.debug(f"Active supplier {managed_supplier.name} resolved from first managed_supplier for user {request.user}")
        return managed_supplier

    logger.debug(f"No active supplier could be resolved for user {request.user}")
    return None
