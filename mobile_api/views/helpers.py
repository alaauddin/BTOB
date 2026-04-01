from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.response import Response
from rest_framework import status
import logging

logger = logging.getLogger('core')

def get_tokens_for_user(user):
    refresh = RefreshToken.for_user(user)
    return {
        'refresh': str(refresh),
        'access': str(refresh.access_token),
    }

def _get_manageable_merchants(user):
    """
    Return the QuerySet of Supplier instances this user can manage.
    - Superusers can manage every merchant.
    - Regular users qualify if they are the owner (user.supplier)
    or listed in Supplier.managing_users.
    """
    from core.models import Supplier
    from django.db.models import Q
    if user.is_superuser:
        return Supplier.objects.filter(is_active=True)
    return Supplier.objects.filter(
        Q(user=user) | Q(managing_users=user)
    ).distinct()

def _merchant_list_data(user, merchants, request=None):
    """Serialize the list of manageable merchants into lightweight dicts.
    Pass `request` so image fields are returned as absolute URLs.
    """
    from ..serializers import MerchantMiniSerializer
    
    context = {'request': request} if request else {}
    return MerchantMiniSerializer(merchants, many=True, context=context).data

def _assert_merchant_access(user, merchant_id):
    """
    Validate that `user` can manage the given merchant.
    - Superusers have access to any merchant.
    - Regular users must be the owner or a managing user.
    Returns (supplier, error_response) — one will be None.
    """
    from core.models import Supplier
    from django.db.models import Q
    if user.is_superuser:
        supplier = Supplier.objects.filter(id=merchant_id).first()
    else:
        supplier = Supplier.objects.filter(
            Q(user=user) | Q(managing_users=user), id=merchant_id
        ).first()
    if not supplier:
        return None, Response(
            {'success': False, 'message': 'Merchant not found or access denied.'},
            status=status.HTTP_403_FORBIDDEN,
        )
    return supplier, None
