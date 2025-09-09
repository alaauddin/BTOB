from django import forms
from django.contrib.auth.forms import UserCreationForm
from django.contrib.auth.models import User
from django.core.validators import RegexValidator




class SignUpForm (UserCreationForm):
    class Meta:
        model=User
        fields = ('username', 'first_name', 'last_name', 'email', 'password1', 'password2')
        labels = {'username': 'اسم المستخدم', 'first_name': 'الاسم الاول', 'last_name': 'الاسم الاخير', 'email': 'البريد الالكتروني', 'password1': 'كلمة المرور', 'password2': 'تاكيد كلمة المرور'}
    
        
        
        
