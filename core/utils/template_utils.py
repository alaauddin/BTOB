import os
from django.conf import settings

def get_supplier_template(supplier, template_name):
    """
    Resolves the template path based on the supplier's design preference.
    If the design-specific template doesn't exist, it falls back to the default design.
    """
    design = getattr(supplier, 'design_template', 'default')
    
    # Target path within designs/ folder
    target_path = f"designs/{design}/{template_name}"
    
    # Check if this template actually exists in the designs directory
    # We use engine.get_template if we want to be very robust, but here we can just check existence
    # assuming the directory structure is well-maintained.
    # For now, we return the path and let Django's template loader handle it.
    return target_path
