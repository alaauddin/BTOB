import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Project.settings')
django.setup()

from django.contrib.auth import authenticate
from django.contrib.auth.models import User

user = User.objects.get(username='alauddintahaaluddin')
print(f"User: {user.username}, Active: {user.is_active}")
print(f"Password Check: {user.check_password('123456')}")

