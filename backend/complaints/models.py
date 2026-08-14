"""
Complaint System Models - Integrated with existing Members
"""
from django.db import models
from django.utils import timezone
from django.conf import settings
import hashlib
import json
import secrets
from datetime import timedelta
# from members.models import Member  # Your existing Member model
from django.core.validators import MinValueValidator, MaxValueValidator

class ComplaintCategory(models.Model):
    """Predefined categories for complaints"""
    name = models.CharField(max_length=100)
    slug = models.SlugField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    default_severity = models.IntegerField(
        default=2,
        validators=[MinValueValidator(1), MaxValueValidator(4)]
    )
    response_days = models.IntegerField(default=10)
    icon = models.CharField(max_length=50, default="📝")
    requires_evidence = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    
    class Meta:
        verbose_name_plural = "Complaint Categories"
        ordering = ['name']
    
    def __str__(self):
        return self.name


class AnonymousSession(models.Model):
    """
    Anonymous submission session linked to member but anonymized
    Each session lasts 24 hours to prevent long-term tracking
    """
    session_hash = models.CharField(max_length=64, unique=True, db_index=True)
    member = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="anonymous_sessions"
    )
    original_hash = models.CharField(max_length=64, db_index=True)
    hashed_ip = models.CharField(max_length=64, db_index=True, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    complaint_count = models.IntegerField(default=0)
    last_submission = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['session_hash', 'expires_at']),
            models.Index(fields=['original_hash', 'created_at']),
        ]
        ordering = ['-created_at']
    
    @classmethod
    def create_for_member(cls, member, request=None):
        """Create anonymous session for authenticated member"""
        from django.utils import timezone
        
        # Generate session hashes
        secret = settings.SECRET_KEY
        date_str = timezone.now().strftime("%Y-%m-%d")
        
        # Base hash for rate limiting
        original_hash = hashlib.sha256(
            f"member_{member.id}_{secret}".encode()
        ).hexdigest()
        
        # Daily changing session hash
        session_hash = hashlib.sha256(
            f"{original_hash}{date_str}{secret}".encode()
        ).hexdigest()
        
        # Check for existing session by hash only to avoid UNIQUE constraint violations
        existing = cls.objects.filter(session_hash=session_hash).first()
        
        if existing:
            # Reactivate if it was inactive or expired
            if not existing.is_active or existing.expires_at <= timezone.now():
                existing.is_active = True
                existing.expires_at = timezone.now() + timedelta(hours=24)
                existing.save()
            return existing
        
        # Create new session if none exists
        ip = request.META.get('REMOTE_ADDR') if request else None
        hashed_ip = None
        if ip:
            hashed_ip = hashlib.sha256(f"{ip}{settings.SECRET_KEY}".encode()).hexdigest()

        session = cls.objects.create(
            session_hash=session_hash,
            member=member,
            original_hash=original_hash,
            expires_at=timezone.now() + timedelta(hours=24),
            hashed_ip=hashed_ip
        )
        return session
    
    def check_quota(self):
        """
        Check if session has reached its submission quota.
        Returns (is_reached, reason, remaining_cooldown_seconds)
        """
        from django.db.models import Q
        from datetime import timedelta
        
        # 1. Check Cooldown (10 minutes)
        if self.last_submission:
            cooldown_period = timedelta(minutes=10)
            if timezone.now() < self.last_submission + cooldown_period:
                remaining = (self.last_submission + cooldown_period) - timezone.now()
                return True, "cooldown", int(remaining.total_seconds())

        # 2. Check Daily Limit (2 per 24 hours) - Include inactive complaints to prevent bypass via deletion
        last_24h = timezone.now() - timedelta(hours=24)
        member_filter = Q(session__member=self.member) if self.member else Q(session__original_hash=self.original_hash)
        
        daily_count = Complaint.objects.filter(member_filter, created_at__gte=last_24h).count()
        if daily_count >= 2:
            return True, "daily", 0

        # 3. Check Weekly Limit (5 per 7 days) - Include inactive complaints
        last_7d = timezone.now() - timedelta(days=7)
        weekly_count = Complaint.objects.filter(member_filter, created_at__gte=last_7d).count()
        if weekly_count >= 5:
            return True, "weekly", 0
                
        return False, None, 0

    @classmethod
    def create_for_guest(cls, request):
        """Create anonymous session for guest user"""
        from django.utils import timezone
        
        secret = settings.SECRET_KEY
        date_str = timezone.now().strftime("%Y-%m-%d")
        
        # Generate random base identifier
        random_id = secrets.token_hex(16)
        original_hash = hashlib.sha256(
            f"guest_{random_id}_{secret}".encode()
        ).hexdigest()
        
        session_hash = hashlib.sha256(
            f"{original_hash}{date_str}{secret}".encode()
        ).hexdigest()
        
        ip = request.META.get('REMOTE_ADDR')
        hashed_ip = hashlib.sha256(f"{ip}{settings.SECRET_KEY}".encode()).hexdigest()

        session = cls.objects.create(
            session_hash=session_hash,
            original_hash=original_hash,
            expires_at=timezone.now() + timedelta(hours=24),
            hashed_ip=hashed_ip
        )
        return session


class Complaint(models.Model):
    """Main complaint model with encryption-ready structure"""
    STATUS_CHOICES = [
        ('pending', '🟡 Sent'),
        ('reviewing', '🔵 Fixing'),
        ('resolved', '✅ Fixed'),
    ]
    
    SEVERITY_CHOICES = [
        (1, '⚪ Low'),
        (2, '🟢 Medium'),
        (3, '🟡 High'),
        (4, '🔴 Urgent'),
    ]
    
    # Identification
    complaint_id = models.CharField(max_length=20, unique=True, db_index=True)
    tracking_code = models.CharField(max_length=12, unique=True)
    
    # Content (encrypted in production)
    encrypted_content = models.TextField()
    category = models.ForeignKey(ComplaintCategory, on_delete=models.PROTECT)
    severity = models.IntegerField(choices=SEVERITY_CHOICES, default=2)
    
    # Anonymity
    session = models.ForeignKey(AnonymousSession, on_delete=models.CASCADE)
    submission_date = models.DateField(auto_now_add=True)
    submission_hour = models.IntegerField()  # 0-23, rounded for privacy
    
    # Status tracking
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True, blank=True)
    
    # Response tracking
    response_deadline = models.DateField()
    escalation_level = models.IntegerField(default=0)
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_complaints"
    )
    
    # Metadata
    evidence_count = models.IntegerField(default=0)
    upvote_count = models.IntegerField(default=0)
    is_edited = models.BooleanField(default=False)
    has_new_reply = models.BooleanField(default=False) # Admin replied → student notified
    has_student_reply = models.BooleanField(default=False) # Student replied → admin notified
    is_active = models.BooleanField(default=True)
    image_attachment = models.TextField(null=True, blank=True) # Base64 encoded, optionally encrypted
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-updated_at']
        indexes = [
            models.Index(fields=['status', 'response_deadline']),
            models.Index(fields=['tracking_code']),
            models.Index(fields=['session', 'created_at']),
        ]
    
    def __str__(self):
        return f"{self.complaint_id} - {self.get_severity_display()}{' (Edited)' if self.is_edited else ''}"

    @classmethod
    def check_similarity(cls, session, content, threshold=0.95):
        """Check for highly similar complaints from the same user in the last 24h"""
        from .encryption import decrypt_text
        from django.utils import timezone
        from datetime import timedelta
        
        content = content.lower().strip()
        last_24h = timezone.now() - timedelta(hours=24)
        
        # Get user's recent complaints
        user_complaints = cls.objects.filter(
            session__original_hash=session.original_hash,
            created_at__gte=last_24h
        )
        
        for comp in user_complaints:
            try:
                decrypted = decrypt_text(comp.encrypted_content).lower().strip()
                if not decrypted:
                    continue
                
                # Check for near-exact or identical matches
                if decrypted == content:
                    return True
                
                # Jaccard similarity for words
                set1 = set(content.split())
                set2 = set(decrypted.split())
                if not set1 or not set2:
                    continue
                    
                intersection = len(set1.intersection(set2))
                union = len(set1.union(set2))
                similarity = intersection / union
                
                if similarity >= threshold:
                    return True
            except:
                continue
        return False
    
    def save(self, *args, **kwargs):
        if not self.complaint_id:
            self.complaint_id = self.generate_complaint_id()
        if not self.tracking_code:
            self.tracking_code = self.generate_tracking_code()
        if not self.submission_hour:
            self.submission_hour = timezone.now().hour
        if not self.response_deadline:
            self.response_deadline = timezone.now() + timedelta(
                days=self.category.response_days
            )
        super().save(*args, **kwargs)
    
    @staticmethod
    def generate_complaint_id():
        """Generate unique complaint ID: COMP-YYYYMM-XXXXX"""
        from django.utils import timezone
        import random
        import string
        
        timestamp = timezone.now().strftime("%Y%m")
        random_part = ''.join(random.choices(string.ascii_uppercase + string.digits, k=5))
        return f"COMP-{timestamp}-{random_part}"
    
    @staticmethod
    def generate_tracking_code():
        """Generate user-friendly tracking code"""
        import random
        import string
        
        # Format: ABC-123-DEF
        part1 = ''.join(random.choices(string.ascii_uppercase, k=3))
        part2 = ''.join(random.choices(string.digits, k=3))
        part3 = ''.join(random.choices(string.ascii_uppercase, k=3))
        return f"{part1}-{part2}-{part3}"




class ComplaintAction(models.Model):
    """Audit trail for all actions on complaints"""
    ACTION_CHOICES = [
        ('submitted', 'Complaint Submitted'),
        ('read', 'Complaint Read'),
        ('status_changed', 'Status Changed'),
        ('assigned', 'Assigned to Staff'),
        ('escalated', 'Escalated'),
        ('commented', 'Comment Added'),
        ('evidence_added', 'Evidence Added'),
        ('reply', 'Principal Reply'),
        ('student_reply', 'Student Reply'),
        ('update_deadline', 'Deadline Updated'),
    ]
    
    complaint = models.ForeignKey(Complaint, on_delete=models.CASCADE, related_name='actions')
    action_type = models.CharField(max_length=50, choices=ACTION_CHOICES)
    member = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    notes = models.TextField(blank=True, null=True) # Unencrypted notes/replies
    encrypted_details = models.TextField(blank=True)  # JSON encrypted
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']


class Notification(models.Model):
    """User notifications system"""
    TYPE_CHOICES = [
        ('reply', 'New Reply'),
        ('status', 'Status Update'),
        ('deadline', 'Deadline Changed'),
        ('escalation', 'Escalated'),
        ('general', 'General Announcement'),
    ]

    recipient = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='notifications')
    complaint = models.ForeignKey(Complaint, on_delete=models.CASCADE, null=True, blank=True)
    title = models.CharField(max_length=255)
    message = models.TextField()
    notification_type = models.CharField(max_length=50, choices=TYPE_CHOICES, default='general')
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    @classmethod
    def notify_admins(cls, title, message, complaint=None, notification_type='general'):
        """Notify all privileged users (Admins, Principals, Staff)"""
        from django.contrib.auth import get_user_model
        from django.db.models import Q
        User = get_user_model()
        
        # Filter for all privileged users
        admins = User.objects.filter(
            Q(is_staff=True) | Q(is_superuser=True) | Q(is_principal=True)
        ).distinct()
        
        notifications = [
            cls(
                recipient=admin,
                complaint=complaint,
                title=title,
                message=message,
                notification_type=notification_type
            )
            for admin in admins
        ]
        
        if notifications:
            cls.objects.bulk_create(notifications)

    def __str__(self):
        return f"{self.recipient.username} - {self.title}"


class ComplaintSettings(models.Model):
    """System-wide complaint settings"""
    cooldown_hours = models.IntegerField(default=24, help_text="Hours between complaints from same user")
    session_hours = models.IntegerField(default=24, help_text="Anonymous session duration")
    max_complaints_per_day = models.IntegerField(default=2, help_text="Max complaints per user daily")
    require_verification = models.BooleanField(default=False, help_text="Require manual verification before posting")
    auto_escalate_days = models.IntegerField(default=7, help_text="Auto-escalate after X days")
    notify_principal = models.BooleanField(default=True, help_text="Notify principal on new complaints")
    global_max_daily = models.IntegerField(default=200, help_text="Max total complaints allowed per day system-wide")
    enable_auto_freeze = models.BooleanField(default=True, help_text="Automatically freeze system when daily limit is reached")
    is_frozen = models.BooleanField(default=False, help_text="Whether the system is currently frozen for new complaints")
    auto_unfreeze_time = models.TimeField(default="00:00", help_text="Daily time when the system automatically unfreezes")
    daily_limit_changes = models.IntegerField(default=0, help_text="Number of times limit was changed today")
    last_limit_change_date = models.DateTimeField(auto_now_add=True)
    last_frozen_date = models.DateField(null=True, blank=True, help_text="Date when system was last frozen")
    
    class Meta:
        verbose_name_plural = "Complaint Settings"
    
    def save(self, *args, **kwargs):
        # Ensure only one settings object
        self.id = 1
        super().save(*args, **kwargs)
    
    @classmethod
    def load(cls):
        from django.utils import timezone
        from datetime import datetime
        obj, created = cls.objects.get_or_create(id=1)
        
        # Auto-unfreeze logic
        if obj.is_frozen and obj.last_frozen_date:
            now = timezone.now()
            # Create a localized datetime for today's reset time
            reset_time = datetime.combine(now.date(), obj.auto_unfreeze_time)
            reset_time = timezone.make_aware(reset_time, timezone.get_current_timezone())
            
            # If system was frozen on a previous day OR it's past the reset time on the same day it was frozen
            if (obj.last_frozen_date < now.date()) or (obj.last_frozen_date == now.date() and now > reset_time):
                obj.is_frozen = False
                # Also reset daily limit change counter if it's a new day
                if obj.last_limit_change_date.date() < now.date():
                    obj.daily_limit_changes = 0
                    obj.last_limit_change_date = now
                obj.save()
            
        return obj