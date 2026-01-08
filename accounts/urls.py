from django.urls import path
from accounts import views
from django.contrib.auth import views as auth_views
from accounts.forms import UserLoginForm

urlpatterns = [

    path('signup/',views.signup, name ='signup'),
    path('logout/',views.logout, name='logout'),
    path('login/', auth_views.LoginView.as_view(template_name='login.html', authentication_form=UserLoginForm),name='login'),
    path('settings/change_password/', auth_views.PasswordChangeView.as_view(template_name='change_password.html'),name='password_change'),
    path('settings/change_password/done',auth_views.PasswordChangeDoneView.as_view(template_name='change_password_done.html'),name='password_change_done'),
    path('account/', views.UserUpdateView.as_view(), name ='my_account'),
    path('api/login/', views.ajax_login_view, name='api_login'),
    path('api/signup/', views.ajax_signup_view, name='api_signup'),
    # path('create_or_update_contact/',views.create_or_update_contact,name='create_or_update_contact'),


]
