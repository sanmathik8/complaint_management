"""
Middleware for tracking user activity and sessions
"""
from django.utils import timezone
from django.utils.deprecation import MiddlewareMixin
from .models import UserSession

class UserActivityMiddleware(MiddlewareMixin):
    """Track user activity and update last_seen"""
    
    def process_request(self, request):
        if request.user.is_authenticated:
            # Update last seen (once per minute)
            if not hasattr(request.user, '_last_seen_updated'):
                request.user.last_seen = timezone.now()
                request.user.is_online = True
                request.user.save(update_fields=['last_seen', 'is_online'])
                request.user._last_seen_updated = True
            
            # Update session activity
            session_key = request.session.session_key
            if session_key:
                UserSession.objects.filter(
                    session_key=session_key,
                    user=request.user
                ).update(last_activity=timezone.now())
        
        return None
    
    def process_response(self, request, response):
        # Clean up expired sessions periodically
        if request.user.is_authenticated:
            from datetime import timedelta
            expiry_threshold = timezone.now() - timedelta(minutes=5)
            
            UserSession.objects.filter(
                user=request.user,
                last_activity__lt=expiry_threshold
            ).delete()
        
        return response


class UsernameChangeMiddleware(MiddlewareMixin):
    """Handle username changes in real-time"""
    
    def process_request(self, request):
        if request.user.is_authenticated:
            # Check if username needs to be updated in session
            session_username = request.session.get('username')
            if session_username != request.user.username:
                request.session['username'] = request.user.username
        
        return None