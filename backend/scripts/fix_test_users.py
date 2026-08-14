import os
import django
import sys
import hashlib

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

def hash_username(name):
    """Replicate frontend hashing logic in Python"""
    name = name.strip().lower()
    # SHA-256
    hash_obj = hashlib.sha256(name.encode('utf-8'))
    # Take first 16 bytes (32 hex characters)
    hash_hex = hash_obj.hexdigest()[:32]
    # BigInt('0x' + hashHex).toString() -> Integer to string
    return str(int(hash_hex, 16))

def fix_users():
    print("Fixing test users with proper hashing...")
    created_count = 0
    updated_count = 0
    
    for display_id, password in users_to_create:
        hashed_username = hash_username(display_id)
        
        # Delete old unhashed user if exists to avoid confusion
        User.objects.filter(username=display_id).delete()
        
        # Check if hashed user exists
        user, created = User.objects.get_or_create(username=hashed_username)
        user.set_password(password)
        user.save()
        
        if created:
            print(f"Created: {display_id} (Hashed: {hashed_username})")
            created_count += 1
        else:
            print(f"Updated Password for: {display_id}")
            updated_count += 1
            
    print(f"\nFinal Status: {created_count} created, {updated_count} updated.")

if __name__ == "__main__":
    fix_users()
