# myown/templatetags/custom_filters.py

from django import template
from core.models import CartItem  # Adjust the import based on your actual model structure

register = template.Library()

@register.filter(name='get_cart_item_count')
def get_cart_item_count(user_cart, product):
    return user_cart.cart_items.filter(product=product).count()
# custom_filters.py
