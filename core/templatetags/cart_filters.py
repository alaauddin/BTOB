# cart_filters.py
from django import template

register = template.Library()

@register.filter
def get_cart_item(cart_items, product):
    # Return the first cart item that matches the product ID or None
    if not hasattr(cart_items, 'filter'):
        return None
    return cart_items.filter(product_id=product.id).first()
