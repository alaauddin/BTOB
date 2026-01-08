from django.http import JsonResponse
from django.contrib.auth.decorators import login_required
from django.views.decorators.http import require_POST
from django.shortcuts import get_object_or_404
from core.models import Supplier, Category, ProductCategory

@login_required
@require_POST
def add_category_ajax(request):
    try:
        if request.user.is_superuser and request.POST.get('supplier_id'):
             supplier = get_object_or_404(Supplier, id=request.POST.get('supplier_id'))
        else:
             supplier = get_object_or_404(Supplier, user=request.user)
        
        parent_id = request.POST.get('parent_id')
        new_parent_name = request.POST.get('new_parent_name')
        subcategory_name = request.POST.get('subcategory_name')
        
        if not subcategory_name:
            return JsonResponse({'success': False, 'message': 'اسم الفئة الفرعية مطلوب'}, status=400)
            
        # Permission checks (Superusers bypass)
        if not request.user.is_superuser:
            if parent_id == 'new' or new_parent_name:
                if not supplier.can_add_categories:
                    return JsonResponse({'success': False, 'message': 'لا تملك صلاحية إضافة فئات رئيسية جديدة'}, status=403)
            
            if not supplier.can_add_product_categories:
                return JsonResponse({'success': False, 'message': 'لا تملك صلاحية إضافة فئات فرعية جديدة'}, status=403)

        # 1. Get or Create Parent Category
        if parent_id and parent_id != 'new':
            parent_category = get_object_or_404(Category, id=parent_id)
        elif new_parent_name:
            parent_category, created = Category.objects.get_or_create(
                name=new_parent_name.strip()
            )
        else:
            return JsonResponse({'success': False, 'message': 'يرجى اختيار فئة رئيسية أو كتابة اسم فئة جديدة'}, status=400)
            
        # 2. Create Subcategory (ProductCategory)
        # Check if subcategory already exists under this parent
        existing = ProductCategory.objects.filter(category=parent_category, name=subcategory_name.strip()).first()
        if existing:
            product_category = existing
        else:
            product_category = ProductCategory.objects.create(
                category=parent_category,
                name=subcategory_name.strip()
            )
            
        return JsonResponse({
            'success': True,
            'message': 'تمت إضافة الفئة بنجاح!',
            'category': {
                'id': product_category.id,
                'name': str(product_category)
            }
        })
        
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=500)
