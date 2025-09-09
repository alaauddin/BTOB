from django import forms
from .models import *



class ShippingAddressForm(forms.ModelForm):
    class Meta:
        model = ShippingAddress
        fields = ['phone','address_line1', 'address_line2','city','country','address_type']


