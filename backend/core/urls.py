from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'profile', views.UserProfileViewSet, basename='profile')
router.register(r'announcements', views.AnnouncementViewSet, basename='announcements')

urlpatterns = [
    # Authentication
    path('register/', views.UserRegistrationView.as_view(), name='register'),
    path('login/', views.UserLoginView.as_view(), name='login'),
    path('logout/', views.UserLogoutView.as_view(), name='logout'),
    
    # Password management
    path('password/reset/', views.PasswordResetView.as_view(), name='password-reset'),
    path('password/reset/confirm/', views.PasswordResetConfirmView.as_view(), name='password-reset-confirm'),
    path('password/change/', views.UserProfileViewSet.as_view({'post': 'change_password'}), name='password-change'),
    path('verify-password/', views.UserProfileViewSet.as_view({'post': 'verify_password'}), name='verify-password'),
    

    
    # Username
    path('check-username/', views.check_username_availability, name='check-username'),
    
    # Sessions
    path('sessions/', views.SessionManagementView.as_view(), name='sessions'),
    path('sessions/<int:session_id>/', views.SessionManagementView.as_view(), name='session-detail'),
    
    # Include router URLs
    path('', include(router.urls)),
]