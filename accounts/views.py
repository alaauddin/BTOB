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
from django.contrib.auth.models import User


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
    template_name = 'read/my_account.html'
    success_url = reverse_lazy('my_account')

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
