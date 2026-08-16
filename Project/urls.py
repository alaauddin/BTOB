"""Project URL Configuration

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/2.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import include, path, re_path
from core import urls
from accounts import urls as accounts_urls
from service_provider import urls as service_provider_urls
from django.conf import settings
from django.conf.urls.static import static
from django.views.static import serve

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', include(urls)),
    path('', include(accounts_urls)),
    path('service_provider/', include(service_provider_urls)),
    path('accounts/', include('allauth.urls')),
    path('api/', include('mobile_api.urls')),
    path('api/subscriptions/', include('subscriptions.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT) + static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)  
else:
    urlpatterns += [
        re_path(r'^media/(?P<path>.*)$', serve, {'document_root': settings.MEDIA_ROOT}),
    ]


def custom_500_handler(request):
    import logging
    logger = logging.getLogger("django.request")
    try:
        from django.shortcuts import render
        return render(request, '500.html', status=500)
    except Exception as e:
        logger.error(f"Error rendering 500 template: {e}", exc_info=True)
        from django.http import HttpResponseServerError
        return HttpResponseServerError(
            "<!DOCTYPE html><html dir='rtl' lang='ar'><head><meta charset='utf-8'><title>خطأ 500</title></head><body style='font-family:sans-serif;text-align:center;padding:50px;'><h2>حدث خطأ في الخادم</h2><p>يرجى تحديث الصفحة والمحاولة مرة أخرى.</p></body></html>",
            content_type="text/html"
        )

handler500 = custom_500_handler