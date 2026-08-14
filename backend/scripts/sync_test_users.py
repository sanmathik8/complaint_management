import os
import django
import sys
import hashlib
import re

# Set up Django environment
backend_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(backend_root)
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'yaatra_backend.settings')
django.setup()

from core.models import User

def hash_username(name):
    """Replicate frontend hashing logic exactly"""
    name = name.strip().lower()
    hash_obj = hashlib.sha256(name.encode('utf-8'))
    hash_hex = hash_obj.hexdigest()[:32]
    return str(int(hash_hex, 16))

def sync_test_users():
    print("Reading credentials from file...")
    # Credentials at backend/test_credentials.txt, script at backend/scripts/sync_test_users.py
    backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    cred_file = os.path.join(backend_dir, 'test_credentials.txt')
    
    with open(cred_file, 'r', encoding='utf-8') as f:
        content = f.read()

    # Extract ID/Password pairs using regex
    # Format: Account ID: <id>\nPassword:   <pass>
    matches = re.findall(r'Account ID:\s+(.+)\nPassword:\s+(.+)', content)
    
    if not matches:
        print("No credentials found in file format.")
        return

    print(f"Found {len(matches)} users to sync.")
    
    for display_id, password in matches:
        display_id = display_id.strip()
        password = password.strip()
        hashed_username = hash_username(display_id)
        
        # Cleanup old unhashed if exists
        User.objects.filter(username=display_id).delete()
        
        # Create/Update hashed user
        user, created = User.objects.get_or_create(username=hashed_username)
        user.set_password(password)
        user.save()
        
        status = "Created" if created else "Updated"
        print(f"[{status}] ID: {display_id} -> Hash: {hashed_username[:10]}...")

    print("\nSync complete. You can now login using the Account IDs in the web interface.")

if __name__ == "__main__":
    sync_test_users()
