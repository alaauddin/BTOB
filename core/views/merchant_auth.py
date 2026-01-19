from django.shortcuts import render, redirect
from django.contrib.auth import login, authenticate
from django.contrib.auth.forms import AuthenticationForm
from django.contrib import messages
from django.views import View

class MerchantLoginView(View):
    template_name = 'merchant_login.html'
    
    def get(self, request):
        if request.user.is_authenticated:
            # If already logged in and is a supplier, redirect to dashboard
            if hasattr(request.user, 'supplier'):
                return redirect('my_merchant')
            # If logged in but not supplier, maybe redirect to join?
            # For now, let's show the login page essentially forcing re-login or different account
            
        form = AuthenticationForm()
        return render(request, self.template_name, {'form': form})

    def post(self, request):
        form = AuthenticationForm(request, data=request.POST)
        if form.is_valid():
            user = form.get_user()
            
            # Check if user is a supplier (or superuser)
            if hasattr(user, 'supplier') or user.is_superuser:
                login(request, user)
                
                # Redirect to 'next' parameter or default dashboard
                next_url = request.GET.get('next')
                if next_url:
                    return redirect(next_url)
                return redirect('my_merchant')
            else:
                messages.error(request, 'هذا الحساب غير مسجل كتاجر. يرجى استخدام حساب تاجر أو الانضمام إلينا.')
        else:
            messages.error(request, 'اسم المستخدم أو كلمة المرور غير صحيحة')
            
        return render(request, self.template_name, {'form': form})
