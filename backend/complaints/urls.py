from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'categories', views.ComplaintCategoryViewSet, basename='complaint-category')
router.register(r'complaints', views.ComplaintViewSet, basename='complaint')
router.register(r'settings', views.ComplaintSettingsViewSet, basename='complaint-settings')
router.register(r'notifications', views.NotificationViewSet, basename='notification')

urlpatterns = [
    path('', include(router.urls)),
    path('session/new/', views.AnonymousSessionView.as_view(), name='new-session'),
    path('complaints/status/', views.ComplaintViewSet.as_view({'get': 'check_status'}), name='check-status'),
    path('complaints/suggest-category/', views.SuggestCategoryView.as_view(), name='suggest-category'),
]