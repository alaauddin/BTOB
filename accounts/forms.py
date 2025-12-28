from django import forms
from django.contrib.auth.forms import UserCreationForm
from django.contrib.auth.models import User
from django.core.validators import RegexValidator




class SignUpForm(forms.ModelForm):
    password = forms.CharField(
        widget=forms.PasswordInput(),
        label='Password / كلمة المرور',
        required=True
    )

    class Meta:
        model = User
        fields = ('username', 'first_name', 'password')
        labels = {
            'username': 'Phone Number / رقم الهاتف',
            'first_name': 'Full Name / الاسم بالكامل',
        }
        help_texts = {
            'username': 'Enter your phone number.',
        }

    def save(self, commit=True):
        user = super().save(commit=False)
        user.set_password(self.cleaned_data["password"])
        if commit:
            user.save()
        return user
    
        
        
        

from django.contrib.auth.forms import AuthenticationForm

class UserLoginForm(AuthenticationForm):
    def __init__(self, *args, **kwargs):
        super(UserLoginForm, self).__init__(*args, **kwargs)
        self.fields['username'].label = 'Phone Number / رقم الهاتف'
        self.fields['password'].label = 'Password / كلمة المرور'
