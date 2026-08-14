from django.conf import settings
from cryptography.fernet import Fernet
import base64
import hashlib

def get_fernet():
    # Derive a 32-byte key from the SECRET_KEY
    key = hashlib.sha256(settings.SECRET_KEY.encode()).digest()
    key_b64 = base64.urlsafe_b64encode(key)
    return Fernet(key_b64)

def encrypt_text(text):
    if not text:
        return ""
    f = get_fernet()
    return f.encrypt(text.encode()).decode()

def decrypt_text(cipher_text):
    if not cipher_text:
        return ""
    try:
        f = get_fernet()
        return f.decrypt(cipher_text.encode()).decode()
    except Exception:
        # Fallback for legacy plain text data
        return cipher_text
