from django.shortcuts import render, redirect
from django.contrib.auth.forms import UserCreationForm
from django.contrib.auth import login as auth_login

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
            user = form.save()
            # created = PersonPostion.objects.create(user=user,position=form.cleaned_data['position'],phone=form.cleaned_data['phone'])
            
            auth_login(request,user)
            return redirect('meetings_index')
           
           

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