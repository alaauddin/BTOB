from django import forms
from django.forms.widgets import ClearableFileInput

class ImageCroppingWidget(ClearableFileInput):
    template_name = 'core/widgets/image_cropping.html'

    class Media:
        # We are including assets directly in the template for simplicity as requested by the plan,
        # but defining them here is also good practice if we were serving them locally.
        # Since we put the CDN links in the template, we can leave this empty or minimal.
        pass
