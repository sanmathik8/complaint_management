from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from django.utils import timezone
from datetime import timedelta
from core.models import User
from complaints.models import Complaint, ComplaintCategory, AnonymousSession, Notification, ComplaintSettings
import hashlib

class ComplaintRefactorTests(APITestCase):
    """
    Comprehensive verification suite for the refactored complaints module.
    Focus on standardized response formats, security quotas, and admin notifications.
    """

    def setUp(self):
        # Create settings
        self.settings = ComplaintSettings.load()
        self.settings.global_max_daily = 100
        self.settings.is_frozen = False
        self.settings.save()

        # Create categories
        self.cat_urgent = ComplaintCategory.objects.create(
            name="Bullying", slug="bullying", requires_evidence=True, response_days=3, default_severity=3
        )
        self.cat_normal = ComplaintCategory.objects.create(
            name="General", slug="general", requires_evidence=False, response_days=7, default_severity=1
        )

        # Create Users
        self.principal = User.objects.create_user(
            username="999000", is_principal=True, email="principal@school.edu", password="testpassword"
        )
        self.staff = User.objects.create_user(
            username="999111", is_staff=True, email="staff@school.edu", password="testpassword"
        )
        self.student = User.objects.create_user(
            username="888000", is_verified=True, email="student@school.edu", password="testpassword"
        )

        # Create and verify an anonymous session
        self.session_hash = hashlib.sha256(b"test_session").hexdigest()
        self.session_original = hashlib.sha256(b"test_session_original").hexdigest()
        self.session = AnonymousSession.objects.create(
            session_hash=self.session_hash,
            original_hash=self.session_original,
            expires_at=timezone.now() + timedelta(days=7)
        )

    def test_standard_success_response_format(self):
        """Verify that successful requests return the new standard JSON structure."""
        url = reverse('complaint-category-list')
        self.client.force_authenticate(user=self.student)
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Verify it's a DICT with 'status': 'success'
        self.assertIsInstance(response.data, dict)
        self.assertEqual(response.data['status'], 'success')
        self.assertIn('data', response.data)
        
        # Check that bullying is in the data
        cat_slugs = [c['slug'] for c in response.data['data']]
        self.assertIn('bullying', cat_slugs)

    def test_anonymous_session_quota_logic(self):
        """Verify centralized quota enforcement in AnonymousSession model."""
        # Initial state - quota should NOT be reached (False)
        is_blocked, reason, remaining = self.session.check_quota()
        self.assertFalse(is_blocked)
        self.assertIsNone(reason)

        # Create one complaint manually
        Complaint.objects.create(
            session=self.session,
            category=self.cat_normal,
            encrypted_content="SGVsbG8gd29ybGQgdmVyeSBsb25nIGNvbnRlbnQgZm9yIHZhbGlkYXRpb24gcHVycG9zZXM=", 
            severity=1,
            submission_hour=12
        )
        self.session.complaint_count = 1
        self.session.last_submission = timezone.now()
        self.session.save()

        # Should be BLOCKED (True) in cooldown (test cooldown limit of 10m)
        is_blocked, reason, remaining = self.session.check_quota()
        self.assertTrue(is_blocked)
        self.assertEqual(reason, "cooldown")

        # Fake time shift (bypass cooldown but hit daily limit of 2)
        self.session.last_submission = timezone.now() - timedelta(minutes=15)
        self.session.save()
        
        # Create second complaint manually
        Complaint.objects.create(
            session=self.session,
            category=self.cat_normal,
            encrypted_content="U2Vjb25kIG9uZSByZXBvcnQgZm9yIHZhbGlkYXRpb24gcHVycG9zZXMgdmVyeSBsb25n",
            severity=1,
            submission_hour=12
        )
        self.session.complaint_count = 2
        self.session.save()

        # Daily limit is 2. Should be BLOCKED (True).
        is_blocked, reason, remaining = self.session.check_quota()
        self.assertTrue(is_blocked)
        self.assertEqual(reason, "daily")

    def test_urgent_complaint_flagging_and_notifications(self):
        """Verify that urgent categories/keywords trigger notifications."""
        url = reverse('complaint-list')
        self.client.force_authenticate(user=self.student)
        
        data = {
            'content': 'Someone is being bullied in the library. This is extremely urgent and dangerous and needs immediate attention via suicide prevention or assault units.',
            'category_slug': 'general', 
            'severity': 1 
        }
        
        # Submit with session hash
        self.client.credentials(HTTP_X_SESSION_HASH=self.session_hash)
        response = self.client.post(url, data)
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        complaint = Complaint.objects.get(tracking_code=response.data['data']['tracking_code'])
        
        # Verify it was flagged as urgent (3)
        self.assertEqual(complaint.severity, 3)
        
        # Verify notifications were created
        notifs = Notification.objects.filter(complaint=complaint)
        self.assertTrue(notifs.exists())

    def test_privileged_access_control(self):
        """Verify that dashboard stats require is_privileged."""
        url = reverse('complaint-dashboard-stats')
        
        # 1. Anonymous - Deny (returns 401 due to IsAuthenticated)
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

        # 2. Regular Student - Deny (returns 403 Forbidden)
        self.client.force_authenticate(user=self.student)
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        # 3. Staff (is_privileged) - Allow
        self.client.force_authenticate(user=self.staff)
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'success')
        self.assertIn('total', response.data['data'])
        self.assertIn('pending', response.data['data'])

    def test_complaint_similarity_check(self):
        """Verify similarity endpoint uses standardized responses."""
        # Create a base complaint
        Complaint.objects.create(
            session=self.session,
            category=self.cat_urgent,
            encrypted_content="VGhlcmUgaXMgYSBsZWFrIGluIHRoZSBneW0uIFdhdGVyIGV2ZXJ5d2hlcmUgaW4gdGhlIGdlbS4=", 
            severity=3,
            submission_hour=12
        )
        
        url = reverse('complaint-check-similarity')
        self.client.force_authenticate(user=self.student)
        data = {'content': 'Water leaking in gymnasium floor near the locker rooms. Flooding everywhere.'}
        
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'success')
        self.assertIn('similar_found', response.data['data'])

    def test_error_response_standardization(self):
        """Verify error_response returns correct keys."""
        # Instead of causing a real exception that bubbles up, we test if the response structure is correct
        # through a handled case like missing category
        url = reverse('complaint-list')
        self.client.force_authenticate(user=self.student)
        data = {'content': 'Valid content length but missing category slug so it fails validation.', 'category_slug': 'non-existent'} 
        
        self.client.credentials(HTTP_X_SESSION_HASH=self.session_hash)
        response = self.client.post(url, data)
        
        # This should return 400 with our standard error format
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data['status'], 'error')
        self.assertIn('message', response.data)
