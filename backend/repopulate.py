
import os
import django
import random
from datetime import timedelta
from django.utils import timezone

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'yaatra_backend.settings') 
django.setup()

from complaints.models import Complaint, ComplaintCategory, AnonymousSession, ComplaintAction, Notification
from complaints.encryption import encrypt_text
from django.db.models import Q
from django.contrib.auth import get_user_model

User = get_user_model()

def populate():
    # 1. Clear existing complaints
    print("Deleting all existing data (Complaints, Actions, Notifications, Sessions)...")
    Complaint.objects.all().delete()
    ComplaintAction.objects.all().delete()
    Notification.objects.all().delete()
    AnonymousSession.objects.all().delete()
    
    # 2. Get categories
    categories = ComplaintCategory.objects.filter(is_active=True)
    print(f"Found {categories.count()} active categories.")
    
    # 3. Get or create a dummy user and session
    admin = User.objects.filter(Q(is_superuser=True) | Q(is_staff=True)).first()
    if not admin:
        print("No admin found. Please create a superuser first.")
        print("No admin/principal found. Please create a superuser first.")
        return

    # 3. Target Users (Account IDs)
    target_usernames = [
        "^8$270%1#388", ")!%(2(!^())5", "+@&10&+#%*06", "!@3!5*)8!&*8",
        "#4&%1!!*2252", "((&%63@6&8(0", "95&7##440)22", "&24@*77#&%53",
        "223#%*2296+4", "8&@)&24(7)^#"
    ]
    
    test_users = []
    for uname in target_usernames:
        u = User.objects.filter(username=uname).first()
        if u:
            test_users.append(u)
    
    if not test_users:
        print("Warning: No specific test users found. Falling back to active members.")
        test_users = list(User.objects.filter(is_staff=False)[:10])
    
    if not test_users:
        print("Error: No users found. Aborting.")
        return

    meaningful_data = {
        "WiFi": [
            "Signal strength is extremely low in the common room area.",
            "The login portal is frequently timing out during peak hours.",
            "Complete outage reported in Block C for the last 4 hours."
        ],
        "Mess": [
            "The evening tea was served cold today.",
            "Found excessive salt in the lunch curry.",
            "Lack of variety in the vegetarian options this week."
        ],
        "Water": [
            "The water cooler on the 2nd floor is making a loud buzzing noise.",
            "Water shortage in the early morning at Block B.",
            "The water from the purifier has a slightly metallic taste."
        ],
        "Ragging & Bullying": [
            "A group of seniors is forcing juniors to stay up late for 'introductions'.",
            "Verbal abuse reported in the cafeteria line by a student.",
            "Intimidation tactics used during sports practice yesterday."
        ],
        "Safety & Security": [
            "The back gate lock seems to be malfunctioning again.",
            "Insufficient lighting in the corridor connecting Block A and B.",
            "Unidentified person seen roaming near the hostel boundary at night."
        ]
    }

    generic_complaints = [
        "Delayed response to previous inquiry regarding this issue.",
        "General dissatisfaction with the current service level.",
        "Request for immediate maintenance and inspection.",
        "The situation is becoming unbearable for students.",
        "Looking for a permanent fix rather than temporary patches."
    ]

    count = 0
    now = timezone.now()
    # Span last 60 days
    start_point = now - timedelta(days=60)
    
    for cat in categories:
        contents = meaningful_data.get(cat.name, generic_complaints)
        
        # 10 complaints per category
        for i in range(10):
            text = contents[i % len(contents)] if i < len(contents) else random.choice(generic_complaints)
            severity = random.choice([1, 2, 3, 4])
            
            # Weighted status: More resolved/reviewing to highlight the interaction logs
            status_choice = random.choices(['pending', 'reviewing', 'resolved'], weights=[2, 3, 5])[0]
            student = random.choice(test_users)
            
            # Create/fetch unique session per student
            session, _ = AnonymousSession.objects.get_or_create(
                member=student,
                defaults={
                    'session_hash': f"session_{student.username}",
                    'original_hash': f"orig_{student.username}",
                    'expires_at': now + timedelta(days=365)
                }
            )
            
            # Randomize creation date
            random_days = random.randint(0, 59)
            created_date = start_point + timedelta(days=random_days, hours=random.randint(0,23))
            
            try:
                c = Complaint(
                    category=cat,
                    encrypted_content=encrypt_text(text),
                    severity=severity,
                    status=status_choice,
                    session=session,
                    is_read=(status_choice != 'pending'),
                    submission_hour = created_date.hour
                )
                c.save()
                
                # Manual Date Override (Complaint & Initial Log)
                Complaint.objects.filter(id=c.id).update(created_at=created_date, updated_at=created_date)
                
                ComplaintAction.objects.create(
                    complaint=c,
                    action_type='submitted',
                    created_at=created_date
                )
                
                # FLOW STEP 2: Principal Reply (for 'reviewing'/'resolved')
                if status_choice in ['reviewing', 'resolved']:
                    reply_date = created_date + timedelta(hours=random.randint(2, 24))
                    ComplaintAction.objects.create(
                        complaint=c,
                        action_type='reply',
                        member=admin,
                        notes="Principal's answer",
                        encrypted_details=encrypt_text("We are working on this. It will be fixed soon."),
                        created_at=reply_date
                    )
                    # Update state
                    Complaint.objects.filter(id=c.id).update(updated_at=reply_date, has_new_reply=True)
                    
                    # FLOW STEP 3: Student Resolution (for 'resolved')
                    if status_choice == 'resolved':
                        resolve_date = reply_date + timedelta(hours=random.randint(4, 48))
                        ComplaintAction.objects.create(
                            complaint=c,
                            action_type='status_changed',
                            member=student,
                            notes="I checked and it is fixed.",
                            encrypted_details=encrypt_text("Thank you for fixing it."),
                            created_at=resolve_date
                        )
                        Complaint.objects.filter(id=c.id).update(updated_at=resolve_date, has_new_reply=False)
                
                count += 1
            except Exception as e:
                print(f"Error creating complaint: {e}")

    print(f"Successfully created {count} complaints for {len(test_users)} users with proper Principal -> Student flow.")

if __name__ == "__main__":
    populate()
