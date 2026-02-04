from django import forms
from .models import Client, Domain

class TenantRegistrationForm(forms.ModelForm):
    domain_name = forms.CharField(max_length=100, label="Store Subdomain", help_text="e.g. store1 (will become store1.platform.com)")
    
    class Meta:
        model = Client
        fields = ['name']
        labels = {
            'name': 'Store Name'
        }

    def clean_domain_name(self):
        data = self.cleaned_data['domain_name']
        if Domain.objects.filter(domain=data).exists():
            raise forms.ValidationError("This subdomain is already taken.")
        return data
