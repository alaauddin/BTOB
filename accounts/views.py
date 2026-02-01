from django.shortcuts import render, redirect
from django.contrib.auth.forms import UserCreationForm
from django.contrib.auth import login as auth_login
from django.contrib.auth import authenticate
from django.http import JsonResponse
import json
from django.views.decorators.csrf import csrf_exempt

from .forms import  SignUpForm
from django.views.generic import UpdateView
from django.views.generic import CreateView

from django.urls import reverse_lazy
from django.urls import reverse_lazy
from django.contrib.auth.models import User
from django.utils.crypto import get_random_string
from django.core.cache import cache
import time


# Create your views here.



def signup (request):
    form = SignUpForm()
    if request.method == "POST":
        
        form = SignUpForm(request.POST)
        if form.is_valid():
            user = form.save(commit=False)
            # Auto-generate email from phone number
            user.email = f"{user.username}@aratatt.com"
            user.save()
            
            auth_login(request, user, backend='django.contrib.auth.backends.ModelBackend')
            return redirect('suppliers_list')
           
           

    return render(request, 'signup.html', {'form':form})



    
class UserUpdateView(UpdateView):
    model=User
    fields =('first_name','last_name', 'email',)
    template_name = 'edit_profile.html'
    success_url = reverse_lazy('user_profile')

    def get_object(self):
        return self.request.user
    




# def create_or_update_contact(request):
#     # person_postion, created = PersonPostion.objects.get_or_create(user=request.user)
    
#     form = PersonPostionFormEdit(request.POST or None, instance=person_postion)
#     if form.is_valid():
#         form.save()
#         return redirect(request.GET.get('next', 'meetings_index'))
    
#     return render(request, 'contact_info.html', {'form': form})


def logout(request):
    request.session.flush()
    return redirect('suppliers_list')

def ajax_login_view(request):
    """
    Handle AJAX login requests.
    Expects JSON data: {'username': '...', 'password': '...'}
    """
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            username = data.get('username')
            password = data.get('password')
            
            user = authenticate(request, username=username, password=password)
            
            if user is not None:
                auth_login(request, user)
                return JsonResponse({
                    'success': True, 
                    'message': 'Login successful',
                    'username': user.username
                })
            else:
                return JsonResponse({
                    'success': False, 
                    'message': 'Invalid credentials'
                })
        except json.JSONDecodeError:
            return JsonResponse({'success': False, 'message': 'Invalid JSON'}, status=400)
            
@csrf_exempt
def ajax_signup_view(request):
    """
    Handle AJAX signup requests.
    Expects JSON data: {'username': '...', 'first_name': '...', 'password': '...'}
    """
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            form = SignUpForm(data)
            if form.is_valid():
                user = form.save(commit=False)
                # Auto-generate email from phone number
                user.email = f"{user.username}@aratatt.com"
                user.save()
                
                auth_login(request, user, backend='django.contrib.auth.backends.ModelBackend')
                return JsonResponse({
                    'success': True, 
                    'message': 'Signup successful',
                    'username': user.username
                })
            else:
                # Get form errors
                errors = {}
                for field, error_list in form.errors.items():
                    errors[field] = error_list[0]
                return JsonResponse({
                    'success': False, 
                    'message': 'يرجى تصحيح الأخطاء',
                    'errors': errors
                })
        except json.JSONDecodeError:
            return JsonResponse({'success': False, 'message': 'Invalid JSON'}, status=400)
            
    return JsonResponse({'success': False, 'message': 'Method not allowed'}, status=405)

@csrf_exempt
def ajax_unified_auth_view(request):
    """
    Handle Unified Authentication (Phone Only).
    Expects JSON data: {'phone': '...'}
    """
    if request.method == 'POST':
        try:
            # Basic Rate Limiting (IP based)
            ip = request.META.get('REMOTE_ADDR')
            cache_key = f"auth_rate_limit_{ip}"
            attempts = cache.get(cache_key, 0)
            
            if attempts > 10: # 10 attempts per minute
                return JsonResponse({'success': False, 'message': 'Too many attempts. Please try again later.'})
            
            cache.set(cache_key, attempts + 1, 60) # Expire in 60s

            try:
                data = json.loads(request.body)
            except json.JSONDecodeError:
                return JsonResponse({'success': False, 'message': 'Invalid JSON'}, status=400)

            phone = data.get('phone')

            if not phone:
                return JsonResponse({'success': False, 'message': 'رقم الهاتف مطلوب'})

            # Check if user exists
            user = User.objects.filter(username=phone).first()

            if user:
                # Login existing user without password check
                auth_login(request, user, backend='django.contrib.auth.backends.ModelBackend')
                return JsonResponse({
                    'success': True, 
                    'message': 'تم تسجيل الدخول بنجاح',
                    'username': user.username
                })
            else:
                # Create New User with random password
                random_password = get_random_string(length=12)
                user = User.objects.create_user(
                    username=phone,
                    email=f"{phone}@aratatt.com",
                    password=random_password,
                    first_name="" # Deferred to checkout
                )
                user.save()
                
                # Log them in immediately
                auth_login(request, user, backend='django.contrib.auth.backends.ModelBackend')
                
                return JsonResponse({
                    'success': True, 
                    'message': 'تم إنشاء الحساب بنجاح',
                    'is_new': True,
                    'username': user.username
                })

        except Exception as e:
            # Catch ALL errors to prevent 500 HTML response
            import traceback
            traceback.print_exc() # Print to server logs
            return JsonResponse({
                'success': False, 
                'message': f'System Error: {str(e)}'
            }, status=200) # Return 200 so frontend displays message instead of catch block
            
    return JsonResponse({'success': False, 'message': 'Method not allowed'}, status=405)
