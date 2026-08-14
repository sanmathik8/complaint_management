from rest_framework import serializers
from django.utils import timezone
from datetime import timedelta
from django.conf import settings
from django.db.models import Q
import hashlib
import base64
import json
from .models import (
    ComplaintCategory, AnonymousSession, Complaint,
    ComplaintAction, ComplaintSettings, Notification
)

class NotificationSerializer(serializers.ModelSerializer):
    complaint = serializers.SlugRelatedField(read_only=True, slug_field='complaint_id')

    class Meta:
        model = Notification
        fields = ['id', 'title', 'message', 'notification_type', 'is_read', 'created_at', 'complaint']
# Removed members import

class ComplaintCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = ComplaintCategory
        fields = ['id', 'name', 'slug', 'description', 'icon', 'requires_evidence']
        read_only_fields = ['slug']

class AnonymousSessionSerializer(serializers.ModelSerializer):
    expires_in = serializers.SerializerMethodField()
    is_quota_reached = serializers.SerializerMethodField()
    remaining_cooldown = serializers.SerializerMethodField()
    cooldown_until = serializers.SerializerMethodField()
    quota_reason = serializers.SerializerMethodField()
    
    class Meta:
        model = AnonymousSession
        fields = [
            'session_hash', 'created_at', 'expires_at', 'expires_in', 
            'complaint_count', 'is_quota_reached', 'remaining_cooldown', 
            'cooldown_until', 'quota_reason'
        ]
        read_only_fields = fields
    
    def get_expires_in(self, obj):
        delta = obj.expires_at - timezone.now()
        return max(0, int(delta.total_seconds() / 3600))

    def get_is_quota_reached(self, obj):
        res, _ = obj.check_quota()
        return not res

    def get_quota_reason(self, obj):
        _, reason = obj.check_quota()
        return reason

    def get_remaining_cooldown(self, obj):
        if not obj.last_submission:
            return 0
        cooldown_end = obj.last_submission + timedelta(minutes=10)
        remaining = cooldown_end - timezone.now()
        return max(0, int(remaining.total_seconds()))

    def get_cooldown_until(self, obj):
        if not obj.last_submission:
            return None
        return obj.last_submission + timedelta(minutes=10)


class ComplaintCreateSerializer(serializers.ModelSerializer):
    content = serializers.CharField(write_only=True, required=True)
    category_slug = serializers.SlugField(write_only=True, required=True)
    
    image_attachment = serializers.CharField(required=False, allow_blank=True, write_only=True)
    
    class Meta:
        model = Complaint
        fields = [
            'content', 'category_slug', 'severity',
            'image_attachment'
        ]

    def validate_image_attachment(self, value):
        if not value:
            return value
        
        # Check size of base64 string (rough estimate: base64 is ~33% larger than binary)
        # 10KB binary = ~13.3KB base64
        # But let's be strict and check binary size.
        import base64
        try:
            # Handle data:image/png;base64,... format
            if ',' in value:
                header, value = value.split(',', 1)
            
            decoded_file = base64.b64decode(value)
            file_size = len(decoded_file)
            
            if file_size > 10 * 1024:
                raise serializers.ValidationError("Image is too large (Maximum 10KB).")
                
            return value
        except Exception as e:
            if isinstance(e, serializers.ValidationError):
                raise e
            raise serializers.ValidationError("Invalid image data.")
    
    def validate_content(self, value):
        """Validate complaint content for privacy"""
        # Check minimum length
        if len(value.strip()) < 50:
            raise serializers.ValidationError("Please provide more details (minimum 50 characters)")
        
        # Check for identifying patterns (simplified)
        identifying_phrases = ['my name is', 'i am', 'room number', 'my id is']
        for phrase in identifying_phrases:
            if phrase in value.lower():
                raise serializers.ValidationError(
                    f"Avoid using identifying phrases like '{phrase}'"
                )
        
        return value
    
    def validate(self, data):
        """
        Consolidated validation for system constraints and integrity.
        Ensures freeze status, global quota, user quota, and similarity are checked.
        """
        request = self.context.get('request')
        if not request or not request.user:
            return data
            
        # 1. System Freeze Check
        settings_obj = ComplaintSettings.load()
        if settings_obj.is_frozen:
            raise serializers.ValidationError(
                "Security Matrix Frozen: System is currently at maximum investigative capacity."
            )
            
        # 2. Global Daily Quota Check
        today_start = timezone.now().replace(hour=0, minute=0, second=0, microsecond=0)
        daily_total = Complaint.objects.filter(created_at__gte=today_start, is_active=True).count()
        
        if daily_total >= settings_obj.global_max_daily:
            # Auto-freeze
            settings_obj.is_frozen = True
            settings_obj.last_frozen_date = timezone.now().date()
            settings_obj.save()
            
            Notification.notify_admins(
                title="SYSTEM OVERFLOW: AREA FROZEN",
                message=f"Daily limit of {settings_obj.global_max_daily} reports reached. Area locked.",
                notification_type='status'
            )
            raise serializers.ValidationError(
                "Critical Capacity Reached: Area is frozen for synchronization."
            )
            
        # 3. User Session & Quota Check
        session = AnonymousSession.create_for_member(request.user, request)
        if not session:
             raise serializers.ValidationError("Security session failed. Please re-login.")
             
        is_reached, reason, remaining = session.check_quota()
        if is_reached:
            messages = {
                "cooldown": f"Security cooldown active. Please wait {remaining}s.",
                "daily": "You have reached your limit of 2 reports per day.",
                "weekly": "You have reached your limit of 5 reports per week."
            }
            raise serializers.ValidationError(messages.get(reason, "Quota reached"))
            
        # 4. Content Similarity Check (New Enforce Lock)
        content = data.get('content')
        if content and Complaint.check_similarity(session, content):
            raise serializers.ValidationError(
                "Duplicate detected: You have already submitted a very similar report recently."
            )
            
        # Store session in validated_data for use in perform_create
        data['session'] = session
        return data


class ComplaintUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer for updating complaints with restricted fields for students.
    Admins use perform_update logic in viewset for their overrides.
    """
    content = serializers.CharField(required=False)
    
    class Meta:
        model = Complaint
        fields = ['content'] # Only allow content updates via this serializer
        
    def validate(self, data):
        instance = self.instance
        if instance.status != 'pending':
            raise serializers.ValidationError("You can only edit pending complaints.")
            
        edit_window = timezone.now() - timedelta(hours=12)
        if instance.created_at < edit_window:
            raise serializers.ValidationError("The 12-hour edit window has passed.")
            
        return data


class ComplaintListSerializer(serializers.ModelSerializer):
    category = ComplaintCategorySerializer(read_only=True)
    status_display = serializers.CharField(source='get_status_display')
    severity_display = serializers.CharField(source='get_severity_display')
    days_until_deadline = serializers.SerializerMethodField()
    username = serializers.SerializerMethodField()
    
    class Meta:
        model = Complaint
        fields = [
            'complaint_id', 'tracking_code', 'category', 'severity',
            'severity_display', 'status', 'status_display',
            'submission_date', 'response_deadline', 'days_until_deadline',
            'upvote_count', 'is_read', 'username',
            'is_edited', 'created_at', 'has_new_reply', 'has_student_reply'
        ]
        read_only_fields = fields
    
    def get_days_until_deadline(self, obj):
        from django.utils import timezone
        if not obj.response_deadline:
            return 0
        # Ensure we compare date to date
        deadline = obj.response_deadline
        if hasattr(deadline, 'date'):
             deadline = deadline.date()
             
        delta = deadline - timezone.now().date()
        return delta.days

    def get_username(self, obj):
        if obj.session.member:
            return obj.session.member.username
        return "Anonymous Guest"


from .encryption import decrypt_text

class ComplaintDetailSerializer(ComplaintListSerializer):
    actions = serializers.SerializerMethodField()
    content = serializers.SerializerMethodField()
    image_attachment = serializers.SerializerMethodField()
    
    class Meta(ComplaintListSerializer.Meta):
        fields = ComplaintListSerializer.Meta.fields + ['actions', 'escalation_level', 'content', 'image_attachment']
        
    def get_content(self, obj):
        return decrypt_text(obj.encrypted_content)
    
    def get_image_attachment(self, obj):
        if obj.image_attachment:
            return decrypt_text(obj.image_attachment)
        return None
    
    def get_actions(self, obj):
        try:
            actions = []
            for action in obj.actions.all().order_by('created_at'):
                data = {
                    'action_type': action.action_type,
                    'created_at': action.created_at,
                }
                if action.action_type == 'reply':
                    data['notes'] = decrypt_text(action.encrypted_details) if action.encrypted_details else action.notes
                    user = action.member
                    if user:
                        if user.is_superuser: data['performed_by_name'] = 'Principal'
                        elif getattr(user, 'is_principal', False): data['performed_by_name'] = 'Principal'
                        else: data['performed_by_name'] = 'Staff'
                    else:
                        data['performed_by_name'] = 'Office'
                elif action.action_type == 'student_reply':
                    data['notes'] = decrypt_text(action.encrypted_details) if action.encrypted_details else action.notes
                    data['performed_by_name'] = 'Student'
                    data['action_type'] = 'student_reply'
                elif action.action_type == 'status_changed':
                    raw_notes = decrypt_text(action.encrypted_details) if action.encrypted_details else action.notes
                    try:
                        status_data = json.loads(raw_notes)
                        new = status_data.get('new_status', 'Unknown').replace('_', ' ').title()
                        data['notes'] = f"Status updated: {new}" 
                    except:
                        data['notes'] = raw_notes
                    data['action_type'] = 'Update'
                elif action.action_type == 'submitted':
                    data['action_type'] = 'Sent'
                else:
                    data['notes'] = action.notes
                    data['action_type'] = 'Update'
                actions.append(data)
            return actions
        except Exception:
            return []


class ComplaintStatusSerializer(serializers.ModelSerializer):
    category = ComplaintCategorySerializer(read_only=True)
    status_display = serializers.CharField(source='get_status_display')
    severity_display = serializers.CharField(source='get_severity_display')
    days_until_deadline = serializers.SerializerMethodField()
    actions = serializers.SerializerMethodField()
    
    class Meta:
        model = Complaint
        fields = [
            'tracking_code', 'complaint_id', 'category',
            'status', 'status_display', 'severity', 'severity_display',
            'submission_date', 'response_deadline', 'days_until_deadline',
            'is_read', 'escalation_level', 'actions'
        ]
        read_only_fields = fields
    
    def get_days_until_deadline(self, obj):
        from django.utils import timezone
        if not obj.response_deadline:
            return 0
        deadline = obj.response_deadline
        if hasattr(deadline, 'date'):
             deadline = deadline.date()
        delta = deadline - timezone.now().date()
        return delta.days
        
    def get_actions(self, obj):
        try:
            actions = []
            # Order actions by creation date (ascending) for a natural log flow
            for action in obj.actions.all().order_by('created_at'):
                data = {
                    'action_type': action.action_type,
                    'created_at': action.created_at,
                }
                # Decrypt notes if they are encrypted details or exist in notes
                if action.action_type == 'reply':
                    data['notes'] = decrypt_text(action.encrypted_details) if action.encrypted_details else action.notes
                    user = action.member
                    if user:
                        if user.is_superuser: data['performed_by_name'] = 'Principal'
                        elif getattr(user, 'is_principal', False): data['performed_by_name'] = 'Principal'
                        else: data['performed_by_name'] = 'Staff'
                    else:
                        data['performed_by_name'] = 'Office'
                elif action.action_type == 'status_changed':
                    raw_notes = decrypt_text(action.encrypted_details) if action.encrypted_details else action.notes
                    try:
                        status_data = json.loads(raw_notes)
                        old = status_data.get('old_status', 'Unknown').replace('_', ' ').title()
                        new = status_data.get('new_status', 'Unknown').replace('_', ' ').title()
                        if old == 'Pending/Reviewing': old = 'In Progress' # Clean up typical backend strings if needed
                        data['notes'] = f"Status updated: {new}" 
                    except:
                        data['notes'] = raw_notes
                    data['action_type'] = 'Update'
                elif action.action_type == 'submitted':
                    data['action_type'] = 'Sent'
                else:
                    data['notes'] = action.notes
                    data['action_type'] = 'Update'
                
                actions.append(data)
            return actions
        except Exception:
            return []




class ComplaintSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = ComplaintSettings
        fields = '__all__'
        read_only_fields = ['id']