from django.shortcuts import render, redirect, get_object_or_404
from django.http import JsonResponse
from django.contrib.auth.decorators import login_required
from django.utils import timezone
from core.models import Supplier
import json


@login_required
def agree_to_terms(request):
    """Handle supplier agreement to terms and conditions"""
    if request.method == 'POST':
        try:
            # Get supplier
            if request.user.is_superuser and request.POST.get('supplier_id'):
                supplier = get_object_or_404(Supplier, id=request.POST.get('supplier_id'))
            else:
                supplier = getattr(request.user, 'supplier', None)
            
            if not supplier:
                return JsonResponse({
                    'success': False,
                    'message': 'م العثور على المورد'
                }, status=404)
            
            # Update agreement
            supplier.agreed_to_terms = True
            supplier.terms_agreed_at = timezone.now()
            supplier.save(update_fields=['agreed_to_terms', 'terms_agreed_at'])
            
            return JsonResponse({
                'success': True,
                'message': 'تم قبول الشروط والأحكام بنجاح',
                'agreed_at': supplier.terms_agreed_at.isoformat()
            })
            
        except Exception as e:
            return JsonResponse({
                'success': False,
                'message': str(e)
            }, status=500)
    
    return JsonResponse({
        'success': False,
        'message': 'طريقة غير مسموحة'
    }, status=405)
