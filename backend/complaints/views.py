import json
import hashlib
import secrets
from datetime import timedelta

from django.utils import timezone
from django.db.models import Count, Q
from django.db.models.functions import TruncDate
from django.utils.dateparse import parse_date
from django.conf import settings
from django.contrib.auth import get_user_model

from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.throttling import AnonRateThrottle
from rest_framework.exceptions import ValidationError

from core.permissions import IsPrincipalOrAdmin
from core.utils import error_response, success_response

from .models import (
    ComplaintCategory, AnonymousSession, Complaint,
    ComplaintSettings, ComplaintAction, Notification
)
from .serializers import (
    ComplaintCategorySerializer, ComplaintCreateSerializer,
    ComplaintListSerializer, ComplaintStatusSerializer,
    ComplaintSettingsSerializer, AnonymousSessionSerializer,
    ComplaintDetailSerializer, NotificationSerializer,
    ComplaintUpdateSerializer
)
from .encryption import encrypt_text, decrypt_text
from .throttling import AnonSubmissionThrottle, SubmissionCooldownThrottle

class ComplaintStatusThrottle(AnonRateThrottle):
    rate = '5/minute'
    scope = 'complaint_status'

User = get_user_model()



class ComplaintCategoryViewSet(viewsets.ReadOnlyModelViewSet):
    """Publicly viewable categories for complaints"""
    queryset = ComplaintCategory.objects.filter(is_active=True)
    serializer_class = ComplaintCategorySerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = None

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return success_response(data=serializer.data)

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return success_response(data=serializer.data)


class ComplaintViewSet(viewsets.ModelViewSet):
    """Handle complaint submissions and management"""
    lookup_field = 'complaint_id'
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        
        # 1. Privileged users see ALL active complaints
        if user.is_privileged:
            return Complaint.objects.filter(is_active=True)
            
        # 2. Regular Authenticated User sees their own complaints
        if user.is_authenticated:
            return Complaint.objects.filter(
                session__member=user,
                is_active=True
            ).distinct()
            
        return Complaint.objects.none()

    def get_throttles(self):
        if self.action == 'create':
            return [AnonSubmissionThrottle()]
        return super().get_throttles()

    def retrieve(self, request, *args, **kwargs):
        try:
            instance = self.get_object()
            
            # Admin opening → clear student reply flag
            if request.user.is_privileged:
                if instance.has_student_reply:
                    instance.has_student_reply = False
                    instance.save(update_fields=['has_student_reply'])

            # Student opening → clear admin reply flag
            else:
                if instance.has_new_reply:
                    instance.has_new_reply = False
                    instance.save(update_fields=['has_new_reply'])

            serializer = self.get_serializer(instance)
            return Response(serializer.data)
        except Exception as e:
            return error_response("Failed to retrieve complaint", exc=e)

    @action(detail=True, methods=['post'], permission_classes=[IsPrincipalOrAdmin])
    def reply(self, request, complaint_id=None):
        """Principal/Admin replies to report"""
        try:
            complaint = self.get_object()
            content = request.data.get('content')
            
            if not content:
                return error_response('Content is required', status_code=status.HTTP_400_BAD_REQUEST)
                
            # Create action log
            ComplaintAction.objects.create(
                complaint=complaint,
                action_type='reply',
                member=request.user,
                notes="Encrypted reply", 
                encrypted_details=encrypt_text(content)
            )
            
            # Update status
            if complaint.status == 'pending':
                complaint.status = 'reviewing'
            
            complaint.has_new_reply = True
            complaint.save()
            
            # Notify student
            if complaint.session and getattr(complaint.session, 'member', None):
                Notification.objects.create(
                    recipient=complaint.session.member,
                    complaint=complaint,
                    title="New Response",
                    message=f"You have a new secure response on complaint #{complaint.tracking_code}",
                    notification_type='reply'
                )
            
            return success_response(
                data={'complaint_status': complaint.status},
                message='Reply sent'
            )
        except Exception as e:
            return error_response('Internal system error processing reply', exc=e)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def student_reply(self, request, complaint_id=None):
        """Student replies back to admin/principal response"""
        try:
            complaint = self.get_object()
            content = request.data.get('content', '').strip()

            if not content:
                return error_response('Reply content is required', status_code=status.HTTP_400_BAD_REQUEST)

            # Only the complaint owner (student) can reply
            if not complaint.session or complaint.session.member != request.user:
                return error_response('You can only reply to your own complaints', status_code=status.HTTP_403_FORBIDDEN)

            # Log the student reply
            ComplaintAction.objects.create(
                complaint=complaint,
                action_type='student_reply',
                member=request.user,
                notes='Student reply',
                encrypted_details=encrypt_text(content)
            )

            # Mark for admin review
            complaint.has_student_reply = True
            complaint.save(update_fields=['has_student_reply'])

            # Notify admins
            Notification.notify_admins(
                title="Student Replied",
                message=f"The student has replied to complaint #{complaint.tracking_code}. Please review and respond.",
                complaint=complaint,
                notification_type='reply'
            )

            return success_response(message='Reply sent successfully')
        except Exception as e:
            return error_response('Failed to submit reply', exc=e)

    @action(detail=True, methods=['post'], permission_classes=[permissions.AllowAny], throttle_classes=[ComplaintStatusThrottle])
    def resolve(self, request, complaint_id=None):
        """Allow student/owner to mark complaint as resolved"""
        try:
            complaint = self.get_object()
            
            if complaint.status == 'resolved':
                 return success_response(message='Already resolved')
                 
            # Block Admin Resolution unless system is FROZEN
            settings_obj = ComplaintSettings.load()
            
            if request.user.is_privileged and not settings_obj.is_frozen:
                return error_response(
                    'Administrative protocols prevent you from closing reports. Only the student can confirm resolution.',
                    status_code=status.HTTP_403_FORBIDDEN
                )

            complaint.status = 'resolved'
            
            # Log action
            ComplaintAction.objects.create(
                complaint=complaint,
                action_type='status_changed',
                member=request.user if request.user.is_authenticated else None,
                encrypted_details=json.dumps({'old_status': 'pending/reviewing', 'new_status': 'resolved'})
            )
            
            complaint.save()
            
            # NOTIFICATION for Admins
            Notification.notify_admins(
                title="Case Closed by Student",
                message=f"Complaint #{complaint.tracking_code} has been marked as resolved by the student.",
                complaint=complaint,
                notification_type='status'
            )
                    
            # Check if we should defreeze
            if settings_obj.is_frozen:
                active_cases = Complaint.objects.filter(status__in=['pending', 'reviewing'], is_active=True).count()
                if active_cases == 0:
                    settings_obj.is_frozen = False
                    settings_obj.save()
                    
                    Notification.notify_admins(
                        title="SYSTEM DEFREEZE: SUBMISSIONS ACTIVE",
                        message="All active signals have been cleared. The submission area has been automatically unlocked.",
                        notification_type='status'
                    )
                    
            return success_response(message='Complaint resolved')
        except Exception as e:
            return error_response('Failed to resolve complaint', exc=e)
    
    def get_serializer_class(self):
        if self.action == 'create':
            return ComplaintCreateSerializer
        elif self.action in ['update', 'partial_update']:
            # Use restricted serializer for non-privileged users
            if not self.request.user.is_privileged:
                return ComplaintUpdateSerializer
            return ComplaintCreateSerializer # Admins can use create serializer for status/severity
        elif self.action == 'list':
            return ComplaintListSerializer
        elif self.action == 'retrieve':
            return ComplaintDetailSerializer
        return ComplaintListSerializer
    
    def perform_update(self, serializer):
        complaint = self.get_object()
        user = self.request.user
        
        if user.is_staff or user.is_superuser or getattr(user, 'is_principal', False):
            if 'content' in serializer.validated_data:
                from rest_framework.exceptions import ValidationError
                raise ValidationError("Administrative Integrity: You cannot alter the original content of a student's report.")
            
            if serializer.validated_data.get('status') == 'resolved':
                from rest_framework.exceptions import ValidationError
                raise ValidationError("Protocol Violation: Admins cannot close reports. Final resolution must be confirmed by the student.")
                
            serializer.save(updated_at=timezone.now())
            return

        if complaint.status != 'pending':
            from rest_framework.exceptions import ValidationError
            raise ValidationError("You can only edit pending complaints.")
            
        edit_window = timezone.now() - timedelta(hours=12)
        if complaint.created_at < edit_window:
            from rest_framework.exceptions import ValidationError
            raise ValidationError("The 12-hour edit window has passed.")

        content = serializer.validated_data.get('content')
        if content:
             serializer.save(
                 encrypted_content=encrypt_text(content),
                 is_edited=True,
                 updated_at=timezone.now()
             )
        else:
             serializer.save(is_edited=True, updated_at=timezone.now())
             
    def perform_destroy(self, instance):
        user = self.request.user
        # Admin Bypass: Admins can delete anything (Soft Delete for consistency)
        if user.is_staff or user.is_superuser or getattr(user, 'is_principal', False):
            instance.is_active = False
            instance.save()
            return

        if instance.status != 'pending':
            from rest_framework.exceptions import ValidationError
            raise ValidationError("You can only delete pending complaints.")
        
        # Soft Delete: Remove from views but preserve for quota tracking
        instance.is_active = False
        instance.save()
    
    def create(self, request, *args, **kwargs):
        """
        Handle secure complaint submission (Authenticated Only).
        Consolidated logic moved to Serializer.validate for single source of truth.
        """
        from django.db import transaction
        try:
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            
            # Extract session and validated data
            session = serializer.validated_data.pop('session')
            content = serializer.validated_data.pop('content')
            category_slug = serializer.validated_data.pop('category_slug')
            img_data = serializer.validated_data.get('image_attachment')
            
            with transaction.atomic():
                # 1. Triage Logic
                category = ComplaintCategory.objects.get(slug=category_slug)
                triggers = ['suicide', 'ragging', 'sexual', 'harassment', 'assault', 'weapon', 'drug', 'fire', 'explosion']
                content_lower = content.lower()
                
                auto_escalated = any(trigger in content_lower for trigger in triggers)
                smart_severity = 3 if auto_escalated else serializer.validated_data.get('severity', category.default_severity)
                
                # 2. Create Complaint
                complaint = Complaint.objects.create(
                    encrypted_content=encrypt_text(content),
                    category=category,
                    severity=smart_severity,
                    session=session,
                    submission_hour=timezone.now().hour,
                    image_attachment=encrypt_text(img_data) if img_data else None,
                    escalation_level=1 if auto_escalated else 0
                )

                # Log submission action
                ComplaintAction.objects.create(
                    complaint=complaint,
                    action_type='submitted',
                    member=request.user,
                    notes='Complaint submitted successfully'
                )

                if auto_escalated:
                    ComplaintAction.objects.create(
                        complaint=complaint,
                        action_type='system_flag',
                        notes='System detected critical keywords. Auto-escalated.',
                    )
                
                # 3. Update Session Stats
                session.complaint_count += 1
                session.last_submission = timezone.now()
                session.save()
                
                # 4. Notify Admins
                Notification.notify_admins(
                    title="New Report Filed",
                    message=f"A new {category.name} report (#{complaint.tracking_code}) has been submitted.",
                    complaint=complaint
                )
            
            return success_response(
                data={
                    'tracking_code': complaint.tracking_code,
                    'complaint_id': complaint.complaint_id,
                    'submission_date': complaint.submission_date,
                    'response_deadline': complaint.response_deadline,
                    'session_hash': session.session_hash,
                },
                message='Complaint submitted anonymously. Save your tracking code.',
                status_code=status.HTTP_201_CREATED
            )
        except ComplaintCategory.DoesNotExist:
             return error_response('Invalid category', status_code=status.HTTP_400_BAD_REQUEST)
        except serializers.ValidationError as e:
            return error_response(str(e.detail[0]) if isinstance(e.detail, list) else str(e.detail), status_code=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return error_response('Internal system error processing submission', exc=e)

    
    @action(detail=False, methods=['GET'], permission_classes=[permissions.AllowAny], throttle_classes=[ComplaintStatusThrottle])
    def check_status(self, request):
        """Public protocol for report tracking"""
        code = request.query_params.get('code')
        session_hash = request.query_params.get('session_hash')
        
        if not code:
            return error_response('Code required', status_code=status.HTTP_400_BAD_REQUEST)
        
        try:
            complaint = Complaint.objects.get(tracking_code=code)
            if session_hash and complaint.session.session_hash != session_hash:
                return error_response('Validation failed', status_code=status.HTTP_403_FORBIDDEN)
            
            serializer = ComplaintStatusSerializer(complaint)
            return success_response(data=serializer.data)
        except Complaint.DoesNotExist:
            return error_response('Not found', status_code=status.HTTP_404_NOT_FOUND)
    
    @action(detail=True, methods=['POST'], permission_classes=[IsPrincipalOrAdmin])
    def update_deadline(self, request, pk=None):
        """Admin overrides the response deadline"""
        try:
            complaint = self.get_object()
            new_date_str = request.data.get('new_date')
            if not new_date_str:
                return Response({'error': 'New date is required'}, status=status.HTTP_400_BAD_REQUEST)
                
            complaint.response_deadline = parse_date(new_date_str)
            complaint.save()
            
            ComplaintAction.objects.create(
                complaint=complaint,
                action_type='update_deadline',
                member=request.user,
                notes=f"Deadline updated to {new_date_str}",
                encrypted_details=encrypt_text(f"Admin override: {new_date_str}")
            )
            return Response({'status': 'Deadline updated', 'new_deadline': complaint.response_deadline})
        except Exception as e:
             return Response({'error': f'Error: {e}'}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'], permission_classes=[IsPrincipalOrAdmin])
    def mark_read(self, request, pk=None):
        """Admin marks the complaint as read (and thus processing)"""
        try:
            complaint = self.get_object()
            status_changed = False
            
            if not complaint.is_read:
                complaint.is_read = True
                complaint.read_at = timezone.now()
                
            if complaint.status == 'pending':
                complaint.status = 'reviewing'
                status_changed = True
                
            complaint.save()
            
            ComplaintAction.objects.create(
                complaint=complaint,
                action_type='read',
                member=request.user,
                notes="Marked as read by investigator"
            )
            
            if status_changed and complaint.session.member:
                Notification.objects.create(
                    recipient=complaint.session.member,
                    complaint=complaint,
                    title="Under Review",
                    message=f"Your complaint #{complaint.tracking_code} is now under review.",
                    notification_type='status'
                )
            
            return success_response(
                data={'new_status': complaint.status},
                message='Marked as read'
            )
        except Exception as e:
            return error_response('Failed to mark as read', exc=e)
    
    @action(detail=False, methods=['GET'], permission_classes=[IsPrincipalOrAdmin])
    def dashboard_stats(self, request):
        """Get dashboard statistics for principal"""
        try:
            active_q = Complaint.objects.filter(is_active=True)
            
            total = active_q.count()
            pending = active_q.filter(status__in=['pending', 'reviewing']).count()
            resolved = active_q.filter(status='resolved').count()
            overdue = active_q.filter(
                response_deadline__lt=timezone.now().date(),
                status__in=['pending', 'reviewing']
            ).count()
            
            ninety_days_ago = timezone.now() - timedelta(days=90)
            daily_stats = active_q.filter(
                created_at__gte=ninety_days_ago
            ).annotate(
                day=TruncDate('created_at')
            ).values('day').annotate(
                count=Count('id')
            ).order_by('day')
            
            return success_response(data={
                'total': total,
                'pending': pending,
                'resolved': resolved,
                'overdue': overdue,
                'daily_stats': list(daily_stats)
            })
        except Exception as e:
            return error_response('Failed to load stats', exc=e)

    @action(detail=True, methods=['post'], permission_classes=[permissions.AllowAny], throttle_classes=[ComplaintStatusThrottle])
    def upvote(self, request, pk=None):
        """Allow upvoting a complaint to show support"""
        try:
            complaint = self.get_object()
            viewed_key = f'upvoted_{complaint.tracking_code}'
            if request.session.get(viewed_key):
                return error_response('Already upvoted', status_code=status.HTTP_400_BAD_REQUEST)
            
            complaint.upvote_count += 1
            complaint.save()
            request.session[viewed_key] = True
            
            return success_response(data={'count': complaint.upvote_count}, message='Upvoted')
        except Exception as e:
            return error_response('Failed to upvote', exc=e)

    @action(detail=False, methods=['post'], permission_classes=[permissions.AllowAny])
    def check_similarity(self, request):
        """Check for similar recent complaints to prevent duplicates"""
        content = request.data.get('content', '').lower().strip()
        if len(content) < 10:
            return success_response(data={'similar_found': False})
            
        recent_complaints = Complaint.objects.filter(
            created_at__gte=timezone.now() - timedelta(days=7),
            is_active=True
        )
        
        count = 0
        examples = []
        for comp in recent_complaints:
            try:
                decrypted = decrypt_text(comp.encrypted_content).lower()
                common_words = set(content.split()) & set(decrypted.split())
                if len(common_words) > 3:
                     count += 1
                     if len(examples) < 2:
                         examples.append({
                             'id': comp.complaint_id,
                             'category': comp.category.name,
                             'date': comp.submission_date
                         })
            except:
                continue
                
        return success_response(data={
            'similar_found': count > 0,
            'count': count,
            'examples': examples,
            'message': f"We found {count} similar reports recently." if count > 0 else "No similar reports found."
        })

    @action(detail=False, methods=['get'], permission_classes=[IsPrincipalOrAdmin])
    def daily_briefing(self, request):
        """Executive summary for the Principal"""
        try:
            today = timezone.now().date()
            today_q = Complaint.objects.filter(created_at__date=today)
            
            total = today_q.count()
            critical = today_q.filter(severity=3).count()
            resolved = Complaint.objects.filter(status='resolved', updated_at__date=today).count()
            
            top_cat_data = today_q.values('category__name').annotate(total=Count('category')).order_by('-total').first()
            top_cat = top_cat_data['category__name'] if top_cat_data else "None"
            
            if total == 0:
                summary = "Campus is quiet today. No new reports submitted."
                sentiment = "Peaceful"
            else:
                sentiment = "Concerned" if critical > 0 else "Stable"
                summary = f"Received {total} new reports today. "
                if critical > 0:
                    summary += f"URGENT: {critical} critical issues detected. "
                summary += f"Primary focus area: {top_cat}."
                
            return success_response(data={
                'date': today.strftime("%B %d, %Y"),
                'stats': {
                    'total': total,
                    'critical': critical,
                    'resolved': resolved,
                    'top_category': top_cat
                },
                'ai_summary': summary,
                'sentiment': sentiment
            })
        except Exception as e:
            return error_response('Briefing generation failed', exc=e)



class AnonymousSessionView(APIView):
    """Manage anonymous submission sessions"""
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        """Create or initialize a session"""
        try:
            if request.user.is_authenticated:
                session = AnonymousSession.create_for_member(request.user, request)
            else:
                 session = AnonymousSession.create_for_guest(request)
            
            serializer = AnonymousSessionSerializer(session)
            return success_response(data=serializer.data)
        except Exception as e:
            return error_response('Failed to initialize session', exc=e)


class ComplaintSettingsViewSet(viewsets.ModelViewSet):
    """System configuration parameters"""
    serializer_class = ComplaintSettingsSerializer
    
    def get_queryset(self):
        ComplaintSettings.load()
        return ComplaintSettings.objects.filter(id=1)

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.IsAuthenticated()]
        return [IsPrincipalOrAdmin()]
    
    def get_object(self):
        return ComplaintSettings.load()

    def perform_update(self, serializer):
        instance = self.get_object()
        new_limit = serializer.validated_data.get('global_max_daily')
        
        if new_limit is not None and new_limit != instance.global_max_daily:
            now = timezone.now()
            if now - instance.last_limit_change_date > timedelta(hours=24):
                instance.daily_limit_changes = 0
                instance.last_limit_change_date = now
                instance.save()
            
            if instance.daily_limit_changes >= 2:
                raise ValidationError("Daily limit adjustment frequency exceeded (max 2 per 24h).")
            
            serializer.save(daily_limit_changes=instance.daily_limit_changes + 1)
        else:
            if serializer.validated_data.get('is_frozen') is True:
                serializer.save(last_frozen_date=timezone.now().date())
            else:
                serializer.save()


class NotificationViewSet(viewsets.ModelViewSet):
    """User alert management"""
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(
            recipient=self.request.user
        ).filter(
            Q(complaint__isnull=True) | Q(complaint__is_active=True)
        ).order_by('-created_at')

    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        notification = self.get_object()
        notification.is_read = True
        notification.save()
        return success_response(message='Notification cleared')

    @action(detail=False, methods=['post'])
    def mark_all_read(self, request):
        self.get_queryset().update(is_read=True)
        return success_response(message='All notifications cleared')

    @action(detail=False, methods=['post'])
    def delete_all(self, request):
        self.get_queryset().delete()
        return success_response(message='Notification history cleared')


class SuggestCategoryView(APIView):
    """Keyword-based category suggestion engine"""
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        content = request.data.get('content', '').lower().strip()
        if not content:
            return success_response(data={'category': None})
            
        categories = ComplaintCategory.objects.filter(is_active=True)
        best_match = None
        max_score = 0
        
        for cat in categories:
            score = 0
            cat_name = cat.name.lower()
            if cat_name in content:
                score += 10
            if cat.slug.replace('-', ' ') in content:
                score += 8
            
            for word in cat_name.split():
                if len(word) > 3 and word in content:
                    score += 2
            
            if score > max_score and score > 0:
                max_score = score
                best_match = cat
        
        if best_match:
            return success_response(data={
                'category': {
                    'name': best_match.name,
                    'slug': best_match.slug,
                    'icon': best_match.icon
                },
                'confidence': 'high' if max_score >= 10 else 'medium',
                'urgent_flag': any(kw in content for kw in ['fire', 'dangerous', 'weapon', 'suicide', 'assault'])
            })
            
        return success_response(data={'category': None})


