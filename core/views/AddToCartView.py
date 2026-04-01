from django.http import JsonResponse
from django.views import View
from django.shortcuts import get_object_or_404
from django.contrib.auth.decorators import login_required
from django.utils.decorators import method_decorator
from core.models import Cart, CartItem, Product

@method_decorator(login_required, name='dispatch')
class AddToCartView(View):
    def post(self, request, *args, **kwargs):
        product_id = request.POST.get('product_id')
        quantity = int(request.POST.get('quantity', 1))
        supplier_id = request.POST.get('supplier_id')

        product = get_object_or_404(Product, pk=product_id)
        if not product.supplier.is_active:
            return JsonResponse({'success': False, 'message': 'المورد غير نشط حالياً.'})
            
        import json
        selected_options = []
        if request.method == 'POST':
            # 1. Try to parse JSON body
            if request.content_type == 'application/json':
                try:
                    data = json.loads(request.body)
                    selected_options = data.get('selected_options', [])
                except (ValueError, json.JSONDecodeError, TypeError):
                    pass
            # 2. Fallback to traditional POST data
            else:
                try:
                    # Handle both 'selected_options' and 'selected_options[]'
                    selected_options = request.POST.getlist('selected_options[]') or request.POST.getlist('selected_options')
                except (ValueError, TypeError):
                    pass

        # Enforce variations selection if product has attributes
        if product.has_attributes() and not selected_options:
            return JsonResponse({
                'success': False, 
                'message': 'الرجاء اختيار الخيارات المطلوبة (مثل المقاس أو اللون)'
            }, status=400)

        user_cart, created = Cart.objects.get_or_create(user=request.user, supplier=product.supplier)

        # Implementation logic similar to CartView.add_to_cart
        from core.db.cart import CartItem
        from core.db.product import ProductAttributeOption
        
        # Clean and sort options
        try:
            option_ids = sorted([int(oid) for oid in selected_options if str(oid).isdigit()])
        except (ValueError, TypeError):
            option_ids = []

        # Find existing item with exact same options
        cart_items = CartItem.objects.filter(cart=user_cart, product=product)
        target_item = None
        for item in cart_items:
            item_option_ids = sorted(list(item.selected_options.values_list('id', flat=True)))
            if item_option_ids == option_ids:
                target_item = item
                break

        if target_item:
            target_item.quantity += quantity
            # Update price/modifiers only if they are not already set (Locking at first addition)
            if not target_item.price:
                target_item.price = product.price
                target_item.discount_price = product.get_price_with_offer()
                if option_ids:
                    target_item.price_modifier_total = sum([o.price_modifier for o in ProductAttributeOption.objects.filter(id__in=option_ids)])
            target_item.save()
        else:
            target_item = CartItem.objects.create(
                cart=user_cart, 
                product=product, 
                quantity=quantity,
                price=product.price,
                discount_price=product.get_price_with_offer()
            )
            if option_ids:
                options = ProductAttributeOption.objects.filter(id__in=option_ids)
                target_item.selected_options.set(options)
                target_item.price_modifier_total = sum([o.price_modifier for o in options])
                target_item.save()

        return JsonResponse({
            'success': True,
            'cart_item_count': target_item.quantity,
            'cart_items_count': user_cart.get_total_items()
        })
