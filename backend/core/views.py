"""
Authentication views for the core app
"""
from rest_framework import viewsets, status, permissions, generics
from rest_framework.decorators import action, api_view, permission_classes, throttle_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.authtoken.models import Token
from rest_framework.authtoken.views import ObtainAuthToken
from django.contrib.auth import login, logout
from django.utils import timezone
from django.core.mail import send_mail
from django.conf import settings
from django.shortcuts import get_object_or_404
import hashlib
import secrets

from .models import User, UsernameHistory, PasswordResetToken, UserSession, Announcement, DeletedIPLock
from .permissions import IsPrincipalOrAdmin
from .serializers import (
    UserRegistrationSerializer, UserLoginSerializer, UserProfileSerializer,
    ChangePasswordSerializer, PasswordResetRequestSerializer,
    PasswordResetConfirmSerializer, AnnouncementSerializer
)
from .utils import success_response, error_response


class UserRegistrationView(generics.CreateAPIView):
    """Handle user registration"""
    serializer_class = UserRegistrationSerializer
    permission_classes = [permissions.AllowAny]
    
    def create(self, request, *args, **kwargs):
        try:
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            user = serializer.save()
            
            token, _ = Token.objects.get_or_create(user=user)
            
            return success_response(
                data={
                    'user': {
                        'id': str(user.id),
                        'username': user.username,
                        'is_verified': user.is_verified
                    },
                    'token': token.key
                },
                message='Registration successful.',
                status_code=status.HTTP_201_CREATED
            )
        except Exception as e:
            return error_response('Registration failed', exc=e)
    



class UserLoginView(ObtainAuthToken):
    """Handle user login with session tracking"""
    serializer_class = UserLoginSerializer
    permission_classes = [permissions.AllowAny]
    
    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        
        # Login user (creates session)
        login(request, user)
        
        # Create or update user session tracking
        self.track_user_session(user, request)
        
        # Update last seen
        user.last_seen = timezone.now()
        user.is_online = True
        user.save(update_fields=['last_seen', 'is_online'])
        
        # Get or create token
        token, created = Token.objects.get_or_create(user=user)
        

        
        return success_response(
            data={
                'user': {
                    'id': str(user.id),
                    'username': user.username,
                    'is_verified': user.is_verified,
                    'is_staff': user.is_privileged
                },
                'token': token.key,
                'session_id': request.session.session_key
            },
            message='Login successful'
        )


    
    def track_user_session(self, user, request):
        """Track user session for security"""
        session_key = request.session.session_key
        
        # Update or create session tracking
        UserSession.objects.update_or_create(
            session_key=session_key,
            defaults={
                'user': user,
                'ip_address': request.META.get('REMOTE_ADDR', ''),
                'user_agent': request.META.get('HTTP_USER_AGENT', ''),
                'expires_at': request.session.get_expiry_date()
            }
        )


class UserLogoutView(APIView):
    """Handle user logout"""
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        session_key = request.session.session_key
        logout(request)
        
        if session_key:
            UserSession.objects.filter(session_key=session_key).delete()
        
        return success_response(message='Logout successful')


class UserProfileViewSet(viewsets.ModelViewSet):
    """Handle user profile operations"""
    serializer_class = UserProfileSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return User.objects.filter(id=self.request.user.id)
    
    def get_object(self):
        return self.request.user
    
    @action(detail=False, methods=['GET'])
    def me(self, request):
        """Current account overview"""
        serializer = self.get_serializer(request.user)
        return success_response(data=serializer.data)
    
    @action(detail=False, methods=['PUT'])
    def update_profile(self, request):
        """Modify profile attributes"""
        try:
            serializer = self.get_serializer(request.user, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return success_response(data=serializer.data, message='Profile updated successfully')
        except Exception as e:
            return error_response('Update unsuccessful', exc=e)
    
    @action(detail=False, methods=['POST'])
    def delete_account(self, request):
        """Permanent account termination with IP lock"""
        user = request.user
        password = request.data.get('password')
        
        if not password or not user.check_password(password):
            return error_response('Verification failed', status_code=status.HTTP_403_FORBIDDEN)
        
        ip_addr = request.META.get('HTTP_X_FORWARDED_FOR', request.META.get('REMOTE_ADDR', '')).split(',')[0].strip()
            
        DeletedIPLock.objects.create(
            ip_address=ip_addr,
            device_fingerprint=getattr(user, 'device_fingerprint', None)
        )
        
        user.delete()
        return success_response(message='Account terminated.')

    @action(detail=False, methods=['GET'])
    def username_history(self, request):
        """Audit of identifier lifecycle"""
        history = UsernameHistory.objects.filter(user=request.user)
        data = [
            {'old': item.old_username, 'new': item.new_username, 'at': item.changed_at}
            for item in history
        ]
        return success_response(data=data)
    
    @action(detail=False, methods=['POST'])
    def change_password(self, request):
        """Credential update protocol"""
        try:
            serializer = ChangePasswordSerializer(data=request.data, context={'request': request})
            serializer.is_valid(raise_exception=True)
            serializer.save()
            
            # Flush existing sessions
            UserSession.objects.filter(user=request.user).exclude(session_key=request.session.session_key).delete()
            
            return success_response(message='Credentials updated. You remain in current session.')
        except Exception as e:
            return error_response('Change failed', exc=e)

    @action(detail=False, methods=['POST'])
    def verify_password(self, request):
        """Verify session authentication status"""
        password = request.data.get('password')
        if not password:
             return error_response('Password required', status_code=status.HTTP_400_BAD_REQUEST)
        
        if request.user.check_password(password):
            return success_response(message='Verified')
        return error_response('Unauthorized', status_code=status.HTTP_401_UNAUTHORIZED)


class PasswordResetView(APIView):
    """Handle password reset requests"""
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        """Security protocol for credential recovery"""
        try:
            serializer = PasswordResetRequestSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            
            username = serializer.validated_data['username'].lower()
            user = User.objects.filter(username__iexact=username, is_active=True).first()
            
            if user:
                token = hashlib.sha256(
                    f"{user.username}{secrets.token_hex(25)}{timezone.now().timestamp()}".encode()
                ).hexdigest()
                
                PasswordResetToken.objects.create(
                    user=user,
                    token=token,
                    expires_at=timezone.now() + timezone.timedelta(hours=24),
                    ip_address=request.META.get('REMOTE_ADDR', '')
                )
                
            return success_response(message='If the account exists, instructions have been generated.')
        except Exception as e:
            return error_response('Request failed', exc=e)


class PasswordResetConfirmView(APIView):
    """Confirm password reset completion"""
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        """Finalize credential update"""
        try:
            serializer = PasswordResetConfirmSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            user = serializer.save()
            
            token, _ = Token.objects.get_or_create(user=user)
            
            return success_response(
                data={'token': token.key},
                message='Password reset successful.'
            )
        except Exception as e:
            return error_response('Reset confirmation failed', exc=e)


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def check_username_availability(request):
    """Identifier availability check"""
    username = request.GET.get('username', '').strip()
    
    if not username:
        return error_response('Parameter required', status_code=status.HTTP_400_BAD_REQUEST)
    
    if len(username) < 3:
        return success_response(data={'available': False, 'reason': 'Too short'})
    
    if len(username) > 30:
        return success_response(data={'available': False, 'reason': 'Too long'})
    
    exists = User.objects.filter(username__iexact=username).exists()
    return success_response(data={'available': not exists})


class SessionManagementView(APIView):
    """Active session governance"""
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        """Audit concurrent access"""
        sessions = UserSession.objects.filter(
            user=request.user,
            expires_at__gt=timezone.now()
        ).order_by('-last_activity')
        
        data = [
            {
                'id': session.id,
                'ip': session.ip_address,
                'ua': session.user_agent,
                'at': session.last_activity,
                'is_current': session.session_key == request.session.session_key
            }
            for session in sessions
        ]
        return success_response(data=data)
    
    def delete(self, request, session_id=None):
        """Remote session termination"""
        try:
            if session_id:
                session = get_object_or_404(UserSession, id=session_id, user=request.user)
                session.delete()
                msg = 'Session terminated'
            else:
                UserSession.objects.filter(user=request.user).exclude(
                    session_key=request.session.session_key
                ).delete()
                msg = 'Other sessions purged'
            return success_response(message=msg)
        except Exception as e:
            return error_response('Termination failed', exc=e)


class AnnouncementViewSet(viewsets.ModelViewSet):
    """Public broadcasting system"""
    queryset = Announcement.objects.filter(is_active=True)
    serializer_class = AnnouncementSerializer
    
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [permissions.IsAuthenticated(), IsPrincipalOrAdmin()]
        return [permissions.AllowAny()]
    
    def perform_create(self, serializer):
        serializer.save(author=self.request.user)

    def perform_update(self, serializer):
        serializer.save(is_edited=True)
