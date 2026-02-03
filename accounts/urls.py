from django.urls import path
from accounts import views
from django.contrib.auth import views as auth_views
from accounts.forms import UserLoginForm

urlpatterns = [

    # Redirect standalone pages to home (using modal instead)
    path('signup/', lambda request: redirect('/'), name='signup'),
    path('login/', lambda request: redirect('/'), name='login'),
    path('settings/change_password/', auth_views.PasswordChangeView.as_view(template_name='change_password.html'),name='password_change'),
    path('settings/change_password/done',auth_views.PasswordChangeDoneView.as_view(template_name='change_password_done.html'),name='password_change_done'),
    path('account/', views.UserUpdateView.as_view(), name ='my_account'),
    path('api/login/', views.ajax_login_view, name='api_login'),
    path('api/signup/', views.ajax_signup_view, name='api_signup'),
    path('api/unified-auth/', views.ajax_unified_auth_view, name='api_unified_auth'),
    path('api/merchant-login/', views.ajax_merchant_login_view, name='api_merchant_login'),
    path('api/password-reset-request/', views.ajax_password_reset_request, name='api_password_reset_request'),
    # path('create_or_update_contact/',views.create_or_update_contact,name='create_or_update_contact'),
    path('logout/',views.logout, name='logout'),


]
