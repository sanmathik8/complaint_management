"""
Enhanced User Model with UUID, email verification, and username change tracking
"""
import uuid
from django.db import models
from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.utils import timezone
from django.utils.crypto import get_random_string
from django.core.validators import RegexValidator
import hashlib

class UserManager(BaseUserManager):
    """Custom user manager with email as primary identifier"""
    
    def create_user(self, username, password=None, **extra_fields):
        """Create a user with username instead of email"""
        if not username:
            raise ValueError('Users must have a username')
        
        # Normalize email if provided
        if 'email' in extra_fields and extra_fields['email']:
            extra_fields['email'] = self.normalize_email(extra_fields['email'])
        
        user = self.model(username=username, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user
    
    def create_superuser(self, username, password=None, **extra_fields):
        """Create a superuser"""
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('is_active', True)
        extra_fields.setdefault('is_verified', True)
        
        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True.')
        
        return self.create_user(username, password, **extra_fields)
    
    def generate_unique_username(self, email):
        """Generate unique username from email"""
        base_username = email.split('@')[0].lower()
        username = base_username
        
        # Ensure uniqueness
        counter = 1
        while self.model.objects.filter(username=username).exists():
            username = f"{base_username}{counter}"
            counter += 1
        
        return username


class User(AbstractUser):
    """Enhanced User model with UUID and username change tracking"""
    
    # Replace default ID with UUID
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Email is optional and non-unique now
    email = models.EmailField(
        blank=True,
        null=True,
        verbose_name='email address',
        db_index=True
    )
    
    # Additional fields
    phone_regex = RegexValidator(
        regex=r'^\+?1?\d{9,15}$',
        message="Phone number must be entered in the format: '+999999999'. Up to 15 digits allowed."
    )
    phone_number = models.CharField(
        validators=[phone_regex],
        max_length=17,
        blank=True,
        null=True
    )
    
    # Verification fields
    is_verified = models.BooleanField(default=True)
    verification_token = models.CharField(max_length=100, blank=True)
    verification_sent_at = models.DateTimeField(null=True, blank=True)
    
    # Profile fields
    profile_picture = models.ImageField(
        upload_to='profile_pics/',
        blank=True,
        null=True
    )
    bio = models.TextField(max_length=500, blank=True)
    style = models.CharField(max_length=50, blank=True, null=True)
    preferences = models.JSONField(default=dict, blank=True)
    
    # Status
    is_active = models.BooleanField(default=True)
    is_principal = models.BooleanField(default=False)
    is_online = models.BooleanField(default=False)
    last_seen = models.DateTimeField(null=True, blank=True)
    
    # Privacy
    is_private = models.BooleanField(default=False)
    
    # Registration tracking
    registration_ip = models.GenericIPAddressField(null=True, blank=True)
    device_fingerprint = models.CharField(max_length=255, null=True, blank=True, db_index=True)
    
    # Timestamps
    date_joined = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Override username field to be unique again
    username = models.CharField(
        max_length=150,
        unique=True,
        help_text='Required. 150 characters or fewer. Digits and symbols (!@+#$%^&*()) only. Strictly no letters.',
        validators=[RegexValidator(r'^[0-9.@+#!$%^&*()\-\[\]{}|;:\'",.<>?/`~]+$', 'Enter a valid username (numbers and symbols only, no letters).')],
        error_messages={
            'unique': "A user with that username already exists.",
        },
    )
    
    # Track username history
    original_username = models.CharField(max_length=150, blank=True)
    username_changed_at = models.DateTimeField(null=True, blank=True)
    
    objects = UserManager()
    
    # Use username as primary identifier
    USERNAME_FIELD = 'username'
    REQUIRED_FIELDS = ['email'] if False else []  # No required fields besides username and password
    
    class Meta:
        indexes = [
            models.Index(fields=['username', 'is_active']),
            models.Index(fields=['date_joined']),
            models.Index(fields=['registration_ip']),
            models.Index(fields=['device_fingerprint']),
        ]
        verbose_name = 'User'
        verbose_name_plural = 'Users'
    
    def __str__(self):
        return self.username
    
    def save(self, *args, **kwargs):
        """Handle username tracking and normalization"""
        is_new = self._state.adding
        
        # For new users, set original username
        if is_new and not self.original_username:
            self.original_username = self.username
        
        # Track username changes
        if not is_new:
            original = User.objects.get(pk=self.pk)
            if original.username != self.username:
                self.username_changed_at = timezone.now()
        
        # Ensure email is normalized
        self.email = self.__class__.objects.normalize_email(self.email)
        
        super().save(*args, **kwargs)
    
    def generate_verification_token(self):
        """Generate email verification token"""
        token = get_random_string(50)
        self.verification_token = hashlib.sha256(
            f"{self.email}{token}{timezone.now().timestamp()}".encode()
        ).hexdigest()
        self.verification_sent_at = timezone.now()
        self.save()
        return self.verification_token
    
    def verify_email(self, token):
        """Verify email with token"""
        if self.verification_token == token:
            self.is_verified = True
            self.verification_token = ''
            self.save()
            return True
        return False
    
    def get_display_name(self):
        """Get display name (username or email prefix)"""
        return self.username or self.email.split('@')[0]
    
    @property
    def can_change_username(self):
        """Check if user can change username again"""
        if not self.username_changed_at:
            return True
        
        # Allow username change once per month
        days_since_change = (timezone.now() - self.username_changed_at).days
        return days_since_change >= 30

    @property
    def is_privileged(self):
        """Check if user has elevated privileges (Staff, Superuser, or Principal)"""
        return self.is_authenticated and (
            self.is_staff or 
            self.is_superuser or 
            self.is_principal
        )


class UsernameHistory(models.Model):
    """Track all username changes for auditing"""
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='username_history'
    )
    old_username = models.CharField(max_length=150)
    new_username = models.CharField(max_length=150)
    changed_at = models.DateTimeField(auto_now_add=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    
    class Meta:
        ordering = ['-changed_at']
        verbose_name_plural = 'Username Histories'
    
    def __str__(self):
        return f"{self.user.username}: {self.old_username} → {self.new_username}"


class LoginHistory(models.Model):
    """Track all login attempts"""
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='login_history',
        null=True,  # For failed attempts with non-existent users
        blank=True
    )
    email = models.CharField(max_length=255)  # Email or username used in attempt
    success = models.BooleanField(default=False)
    ip_address = models.GenericIPAddressField()
    user_agent = models.TextField(blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    failure_reason = models.CharField(max_length=100, blank=True)
    
    class Meta:
        ordering = ['-timestamp']
        verbose_name_plural = 'Login Histories'
    
    def __str__(self):
        status = "Success" if self.success else f"Failed: {self.failure_reason}"
        return f"{self.email} - {status}"


class PasswordResetToken(models.Model):
    """Secure password reset tokens"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reset_tokens')
    token = models.CharField(max_length=100, unique=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    used_at = models.DateTimeField(null=True, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def is_valid(self):
        """Check if token is still valid"""
        return (
            not self.used_at and
            self.expires_at > timezone.now()
        )
    
    def mark_used(self):
        """Mark token as used"""
        self.used_at = timezone.now()
        self.save()


class UserSession(models.Model):
    """Track active user sessions"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sessions')
    session_key = models.CharField(max_length=40, db_index=True)
    ip_address = models.GenericIPAddressField()
    user_agent = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    last_activity = models.DateTimeField(auto_now=True)
    expires_at = models.DateTimeField()
    
    class Meta:
        indexes = [
            models.Index(fields=['user', 'expires_at']),
            models.Index(fields=['session_key']),
        ]
    
    def __str__(self):
        return f"{self.user.username} - {self.session_key[:10]}..."
    
    def is_active(self):
        """Check if session is still active"""
        return self.expires_at > timezone.now()

class Announcement(models.Model):
    """Global announcements from Admins/Principals"""
    title = models.CharField(max_length=200)
    content = models.TextField()
    author = models.ForeignKey(User, on_delete=models.CASCADE, related_name='announcements')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True)
    is_edited = models.BooleanField(default=False)
    
    class Meta:
        ordering = ['-created_at']
        
    def __str__(self):
        return self.title

class DeletedIPLock(models.Model):
    """Lock IP and Device from registering again for 48 hours after account deletion"""
    ip_address = models.GenericIPAddressField(db_index=True)
    device_fingerprint = models.CharField(max_length=255, null=True, blank=True, db_index=True)
    deleted_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-deleted_at']
        indexes = [
            models.Index(fields=['ip_address', 'deleted_at']),
            models.Index(fields=['device_fingerprint', 'deleted_at']),
        ]

    def __str__(self):
        return f"{self.ip_address} / {self.device_fingerprint} deleted at {self.deleted_at}"
