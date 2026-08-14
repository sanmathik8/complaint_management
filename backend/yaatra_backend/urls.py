# project/urls.py
from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse

def health_check(request):
    return JsonResponse({'status': 'healthy'})

urlpatterns = [
    path('healthz', health_check, name='health_check'),
    path('admin/', admin.site.urls),
    path('api/', include('core.urls')),      # Auth endpoints (login, register, profile)
    path('api/complaints/', include('complaints.urls')), # Complaint management
]