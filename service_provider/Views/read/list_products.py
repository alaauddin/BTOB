


from core.models import Category, Product, ProductCategory, Supplier
from django.shortcuts import render

def list_products(request):
    supplier = Supplier.objects.get(user=request.user)
    
    # Base query for the supplier's products
    products = Product.objects.filter(supplier=supplier, supplier__user=request.user)

    # Get all categories and product categories for filters
    categories = Category.objects.filter(supplier=supplier)
    product_categories = ProductCategory.objects.filter(category__in=categories).distinct()

    # Filtering logic
    name = request.GET.get('name', '').strip()
    category_id = request.GET.get('category')
    product_category_id = request.GET.get('product_category')

    if name:
        products = products.filter(name__icontains=name)
    if category_id:
        products = products.filter(category__category_id=category_id)
    if product_category_id:
        products = products.filter(category_id=product_category_id)

    # Pass filtered products and categories to the template
    return render(
        request,
        'read/list_products.html',
        {
            'products': products,
            'categories': categories,
            'product_categories': product_categories,
        }
    )
