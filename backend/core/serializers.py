"""
Serializers for authentication and user management
"""
from rest_framework import serializers
from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from django.utils import timezone
from django.core.validators import validate_email
from django.core.exceptions import ValidationError
from .models import User, UsernameHistory, LoginHistory, PasswordResetToken, Announcement
from django.conf import settings
from django.db.models import Q
import re

class UserRegistrationSerializer(serializers.ModelSerializer):
    """Serializer for user registration"""
    password = serializers.CharField(
        write_only=True,
        required=True,
        style={'input_type': 'password'},
        min_length=8,
        max_length=128
    )
    password_confirm = serializers.CharField(
        write_only=True,
        required=True,
        style={'input_type': 'password'}
    )
    
    class Meta:
        model = User
        fields = [
            'username', 'password', 'password_confirm',
            'phone_number', 'bio', 'device_fingerprint'
        ]
        extra_kwargs = {
            'username': {'required': True},
            'device_fingerprint': {'required': True}
        }
    

    
    def validate_username(self, value):
        """Validate and normalize username"""
        if not value:
            return value
        
        value = value.lower().strip()
        
        # Username validation rules
        if len(value) < 3:
            raise serializers.ValidationError("Username must be at least 3 characters long.")
        if len(value) > 150:
            raise serializers.ValidationError("Username cannot exceed 150 characters.")
        
        # Numbers and symbols only
        if not re.match(r'^[0-9.@+#!$%^&*()\-\[\]{}|;:\'",.<>?/`~]+$', value):
            raise serializers.ValidationError(
                "Username can only contain numbers and symbols (!@+#$%^&*()). Letters are not allowed."
            )
        
        # Check if username is available
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("This username is already taken.")
        
        return value

    def validate_password(self, value):
        """Validate password complexity"""
        try:
            validate_password(value)
        except ValidationError as e:
            raise serializers.ValidationError(list(e.messages))
        return value
    
    def validate(self, data):
        """Validate password match and IP address"""
        if data.get('password') != data.get('password_confirm'):
            raise serializers.ValidationError({
                'password_confirm': 'Passwords do not match.'
            })
        
        # Check IP address limit
        request = self.context.get('request')
        if request:
            # Try to get real IP from proxy headers first
            x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
            if x_forwarded_for:
                ip_address = x_forwarded_for.split(',')[0].strip()
            else:
                ip_address = request.META.get('REMOTE_ADDR')

            if ip_address:
                # Only enforce physical device limits if STRICT_REGISTRATION_LIMITS is enabled
                if getattr(settings, 'STRICT_REGISTRATION_LIMITS', True):
                    # Check if this IP has already registered an account
                    if User.objects.filter(registration_ip=ip_address).exists():
                        raise serializers.ValidationError({
                            'non_field_errors': "An account has already been created from this device. Only one account per device is allowed to ensure system integrity."
                        })
                    
                    # Check Device Fingerprint Limit
                    device_fp = data.get('device_fingerprint')
                    if device_fp and User.objects.filter(device_fingerprint=device_fp).exists():
                        raise serializers.ValidationError({
                            'non_field_errors': "This physical device is already linked to an existing account. Multiple accounts are restricted to prevent system abuse."
                        })

                    # Check for 48 hour deletion lock
                    from .models import DeletedIPLock
                    lock = DeletedIPLock.objects.filter(
                        Q(ip_address=ip_address) | Q(device_fingerprint=device_fp),
                        deleted_at__gte=timezone.now() - timezone.timedelta(hours=48)
                    ).first()
                    if lock:
                        raise serializers.ValidationError({
                            'non_field_errors': "You recently deleted an account from this device. To prevent system abuse, please wait 48 hours before creating a new one."
                        })

                data['registration_ip'] = ip_address

        # Remove password_confirm from validated data
        data.pop('password_confirm', None)
        
        return data
    
    def create(self, validated_data):
        """Create new user with hashed password and registration IP"""
        # Username is now required and handled by model
        # No automatic generation from email prefix needed
        
        user = User.objects.create_user(**validated_data)
        
        # Generate verification token
        user.generate_verification_token()
        
        return user


class UserLoginSerializer(serializers.Serializer):
    """Serializer for user login"""
    username = serializers.CharField(required=True)
    password = serializers.CharField(
        write_only=True,
        required=True,
        style={'input_type': 'password'}
    )
    
    def validate(self, data):
        """Validate user credentials"""
        login_id = data.get('username', '').lower().strip()
        password = data.get('password')
        
        if not login_id or not password:
            raise serializers.ValidationError("Both username and password are required.")
        
        # Check for account lockout (e.g., 5 failed attempts in the last 15 minutes)
        request = self.context.get('request')
        
        recent_failures = LoginHistory.objects.filter(
            email=login_id,
            success=False,
            timestamp__gte=timezone.now() - timezone.timedelta(minutes=15)
        ).count()
        
        if recent_failures >= 5:
            raise serializers.ValidationError(
                "Too many failed login attempts. Please try again in 15 minutes."
            )

        # Try to authenticate user
        user = authenticate(
            request=request,
            username=login_id,
            password=password
        )
        
        if not user:
            # Check if user exists to provide slightly better internal logging
            user_exists = User.objects.filter(username=login_id).exists()
            
            # Log failed attempt
            LoginHistory.objects.create(
                email=login_id,
                success=False,
                ip_address=request.META.get('REMOTE_ADDR', '') if request else '0.0.0.0',
                user_agent=request.META.get('HTTP_USER_AGENT', '') if request else '',
                failure_reason="Invalid credentials" if user_exists else "User not found"
            )
            raise serializers.ValidationError("Invalid username or password.")
        
        if not user.is_active:
            raise serializers.ValidationError("This account is disabled.")
        
        # Log successful login
        LoginHistory.objects.create(
            user=user,
            email=login_id,
            success=True,
            ip_address=self.context.get('request').META.get('REMOTE_ADDR', ''),
            user_agent=self.context.get('request').META.get('HTTP_USER_AGENT', '')
        )
        
        data['user'] = user
        return data


class UserProfileSerializer(serializers.ModelSerializer):
    """Serializer for user profile (read-only)"""

    username = serializers.CharField(required=False)
    can_change_username = serializers.BooleanField(read_only=True)
    days_until_username_change = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = [
            'id', 'username', 'phone_number', 'profile_picture',
            'bio', 'is_verified', 'date_joined', 'last_login',
            'can_change_username', 'days_until_username_change', 'is_staff',
            'is_superuser', 'is_principal',
            'style', 'preferences'
        ]
        read_only_fields = ['id', 'is_verified', 'date_joined', 'last_login', 'is_staff', 'is_superuser', 'is_principal']
    
    def get_days_until_username_change(self, obj):
        """Calculate days until user can change username again"""
        if not obj.username_changed_at:
            return 0
        
        days_since = (timezone.now() - obj.username_changed_at).days
        return max(0, 30 - days_since)
    
    def validate_username(self, value):
        """Validate username change"""
        request = self.context.get('request')
        user = request.user if request else None
        
        if not user:
            return value
        
        # Check if username is changing
        if value == user.username:
            return value
        
        # Check if user can change username
        if not user.can_change_username:
            days_until = self.get_days_until_username_change(user)
            raise serializers.ValidationError(
                f"You can change your username again in {days_until} days."
            )
        
        # Validate new username
        if not value:
            raise serializers.ValidationError("Username cannot be empty.")
        
        if len(value) < 3:
            raise serializers.ValidationError("Username must be at least 3 characters long.")
        
        if len(value) > 150:
            raise serializers.ValidationError("Username cannot exceed 150 characters.")
        
        if not re.match(r'^[0-9.@+#!$%^&*()\-\[\]{}|;:\'",.<>?/`~]+$', value):
            raise serializers.ValidationError(
                "Username can only contain numbers and symbols (!@+#$%^&*()). Letters are not allowed."
            )
        
        # Check if username is available (excluding current user)
        if User.objects.filter(username__iexact=value).exclude(id=user.id).exists():
            raise serializers.ValidationError("This username is already taken.")
        
        return value
    
    def update(self, instance, validated_data):
        """Update user profile with username change tracking"""
        old_username = instance.username
        
        # Update instance
        instance = super().update(instance, validated_data)
        
        # Track username change
        if old_username != instance.username:
            UsernameHistory.objects.create(
                user=instance,
                old_username=old_username,
                new_username=instance.username,
                ip_address=self.context.get('request').META.get('REMOTE_ADDR', ''),
                user_agent=self.context.get('request').META.get('HTTP_USER_AGENT', '')
            )
        
        return instance


class ChangePasswordSerializer(serializers.Serializer):
    """Serializer for changing password"""
    old_password = serializers.CharField(
        required=True,
        style={'input_type': 'password'},
        write_only=True
    )
    new_password = serializers.CharField(
        required=True,
        style={'input_type': 'password'},
        write_only=True,
        min_length=8,
        max_length=128
    )
    confirm_password = serializers.CharField(
        required=True,
        style={'input_type': 'password'},
        write_only=True
    )
    
    def validate_old_password(self, value):
        """Verify old password"""
        user = self.context.get('request').user
        if not user.check_password(value):
            raise serializers.ValidationError("Current password is incorrect.")
        return value
    
    def validate(self, data):
        """Validate new password match"""
        if data['new_password'] != data['confirm_password']:
            raise serializers.ValidationError({
                'confirm_password': 'New passwords do not match.'
            })
        
        # Check if new password is different from old
        if data['old_password'] == data['new_password']:
            raise serializers.ValidationError({
                'new_password': 'New password must be different from current password.'
            })
        
        return data
    
    def save(self, **kwargs):
        """Update user's password"""
        user = self.context.get('request').user
        user.set_password(self.validated_data['new_password'])
        user.save()
        return user


class PasswordResetRequestSerializer(serializers.Serializer):
    """Serializer for requesting password reset"""
    username = serializers.CharField(required=True)
    
    def validate_username(self, value):
        """Check if username exists"""
        if not User.objects.filter(username__iexact=value, is_active=True).exists():
            # Don't reveal if username exists for security
            raise serializers.ValidationError("If this user exists, you'll receive a reset instruction.")
        return value


class PasswordResetConfirmSerializer(serializers.Serializer):
    """Serializer for confirming password reset"""
    token = serializers.CharField(required=True)
    new_password = serializers.CharField(
        required=True,
        style={'input_type': 'password'},
        write_only=True,
        min_length=8,
        max_length=128
    )
    confirm_password = serializers.CharField(
        required=True,
        style={'input_type': 'password'},
        write_only=True
    )
    
    def validate(self, data):
        """Validate token and passwords"""
        # Check passwords match
        if data['new_password'] != data['confirm_password']:
            raise serializers.ValidationError({
                'confirm_password': 'Passwords do not match.'
            })
        
        # Validate token
        try:
            reset_token = PasswordResetToken.objects.get(
                token=data['token'],
                used_at__isnull=True,
                expires_at__gt=timezone.now()
            )
        except PasswordResetToken.DoesNotExist:
            raise serializers.ValidationError({
                'token': 'Invalid or expired reset token.'
            })
        
        data['reset_token'] = reset_token
        return data
    
    def save(self, **kwargs):
        """Reset password and mark token as used"""
        reset_token = self.validated_data['reset_token']
        user = reset_token.user
        
        # Update password
        user.set_password(self.validated_data['new_password'])
        user.save()
        
        # Mark token as used
        reset_token.mark_used()
        
        # Invalidate all user sessions
        user.sessions.filter(expires_at__gt=timezone.now()).delete()
        
        return user


class AnnouncementSerializer(serializers.ModelSerializer):
    author_name = serializers.SerializerMethodField()
    
    class Meta:
        model = Announcement
        fields = ['id', 'title', 'content', 'author_name', 'created_at', 'updated_at', 'is_active', 'is_edited']
        read_only_fields = ['id', 'author_name', 'created_at', 'updated_at', 'is_edited']

    def get_author_name(self, obj):
        user = obj.author
        if not user:
            return "System"
            
        if user.is_principal:
            return "Principal"
        if user.is_superuser:
            return "System Admin"
        if user.is_staff:
            return "Safety Officer"
            
        return user.get_display_name()



