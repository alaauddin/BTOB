"""Shared utility functions used across multiple model modules."""

import os
import uuid


def upload_to_path(instance, filename):
    """Generate a unique upload path based on the model type.

    Args:
        instance: The model instance the file is being attached to.
        filename: The original filename of the uploaded file.

    Returns:
        A string path for the uploaded file.
    """
    ext = filename.split('.')[-1]
    new_filename = f"{uuid.uuid4().hex}.{ext}"
    model_name = instance._meta.model_name

    if model_name == 'suppliercategory':
        return os.path.join('images/supplier_category_images/', new_filename)
    elif model_name == 'supplier':
        return os.path.join('images/supplier_images/', new_filename)
    elif model_name == 'product':
        return os.path.join('images/product_images/', new_filename)
    elif model_name == 'supplierads':
        return os.path.join('ads_image/', new_filename)
    elif model_name == 'systemsettings':
        return os.path.join('system/', new_filename)
    elif model_name == 'businessrequest':
        return os.path.join('business_requests/', new_filename)

    return os.path.join('uploads/', new_filename)
