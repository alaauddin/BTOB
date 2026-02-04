from django.shortcuts import render, redirect
from django.views.generic import FormView
from django.db import transaction
from .forms import TenantRegistrationForm
from .models import Client, Domain

class TenantRegisterView(FormView):
    template_name = 'tenants/register.html'
    form_class = TenantRegistrationForm
    success_url = '/register/success/'

    def form_valid(self, form):
        with transaction.atomic():
            # Create Client (Tenant)
            tenant = form.save(commit=False)
            
            # Use domain name as schema name (sanitized)
            domain_name = form.cleaned_data['domain_name']
            tenant.schema_name = domain_name.lower() # schema_name must be lowercase
            
            tenant.save() # This creates the schema

            # Create Domain
            # Ideal validation: Ensure domain_name matches regex ^[a-z0-9]+$ 
            # as postgres schemas are strict.
            full_domain = f"{domain_name}.localhost" # Default for local dev
            
            Domain.objects.create(domain=full_domain, tenant=tenant, is_primary=True)
            
        return super().form_valid(form)

def registration_success(request):
    return render(request, 'tenants/register_success.html')
