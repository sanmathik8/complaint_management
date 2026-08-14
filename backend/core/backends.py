"""
Custom authentication backends
"""
from django.contrib.auth.backends import ModelBackend
from django.contrib.auth import get_user_model

User = get_user_model()

# Custom backends removed as they supported email. 
# Using default ModelBackend which supports username.