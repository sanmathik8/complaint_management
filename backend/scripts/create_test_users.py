import os
import django
import random
import string
import sys

# Set up Django environment
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'yaatra_backend.settings')
django.setup()

from core.models import User

def generate_random_id():
    symbols = "!@+#$%^&*()"
    chars = string.digits + symbols
    return "".join(random.choice(chars) for _ in range(12))

def generate_password():
    chars = string.ascii_letters + string.digits + "!@#$%^&*"
    # Ensure it meets the 10-char, uppercase, number, symbol rule
    p = [
        random.choice(string.ascii_uppercase),
        random.choice(string.digits),
        random.choice("!@#$%^&*"),
    ]
    p += [random.choice(chars) for _ in range(7)]
    random.shuffle(p)
    return "".join(p)

def create_users(count=10):
    output_file = "test_credentials.txt"
    with open(output_file, "w") as f:
        f.write("SPEAKSAFE TEST CREDENTIALS\n")
        f.write("==========================\n\n")
        
        for i in range(count):
            username = generate_random_id()
            password = generate_password()
            
            # Ensure unique username
            while User.objects.filter(username=username).exists():
                username = generate_random_id()
            
            # Create user
            User.objects.create_user(username=username, password=password)
            
            f.write(f"User {i+1}:\n")
            f.write(f"Account ID: {username}\n")
            f.write(f"Password:   {password}\n")
            f.write("-" * 20 + "\n")
            
            print(f"Created User {i+1}: {username}")

    print(f"\nSuccessfully created {count} test users.")
    print(f"Credentials saved to: {os.path.abspath(output_file)}")

if __name__ == "__main__":
    create_users()
