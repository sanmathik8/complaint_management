import os
import django
import sys

# Set up Django environment
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'yaatra_backend.settings')
django.setup()

from core.models import User

users_to_create = [
    ("^8$270%1#388", "&PQaD9CfrV"),
    (")!%(2(!^())5", "8wPOt%h&4J"),
    ("+@&10&+#%*06", "3@jEPJc*Dk"),
    ("!@3!5*)8!&*8", "yQ!Vg*py1!"),
    ("#4&%1!!*2252", "5RXa39bz^2"),
    ("((&%63@6&8(0", "F2j#lvD^n$"),
    ("95&7##440)22", "$Yu23SYbhY"),
    ("&24@*77#&%53", "t1M5Jz4o%r"),
    ("223#%*2296+4", "4JhdJ6hmY$"),
    ("8&@)&24(7)^#", "A6^gTNx^^0"),
]

def create_specific_users():
    print("Starting specific user creation...")
    created_count = 0
    skipped_count = 0
    
    for username, password in users_to_create:
        if User.objects.filter(username=username).exists():
            print(f"Skipping: User {username} already exists.")
            skipped_count += 1
            continue
            
        try:
            User.objects.create_user(username=username, password=password)
            print(f"Created: User {username}")
            created_count += 1
        except Exception as e:
            print(f"Error creating user {username}: {e}")
            
    print(f"\nFinal Status: {created_count} created, {skipped_count} already existed.")

if __name__ == "__main__":
    create_specific_users()
