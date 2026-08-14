from rest_framework import permissions

class IsPrincipalOrAdmin(permissions.BasePermission):
    """Custom permission for principal/admin users"""
    def has_permission(self, request, view):
        return hasattr(request.user, 'is_privileged') and request.user.is_privileged
