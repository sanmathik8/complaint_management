from rest_framework.response import Response
from rest_framework import status
import traceback
from django.utils import timezone
from django.conf import settings

def success_response(data=None, message=None, status_code=status.HTTP_200_OK):
    """
    Standard Success Response Template
    Format:
    {
        "status": "success",
        "message": "...",
        "data": { ... } or [ ... ]
    }
    """
    response_body = {"status": "success"}
    if message:
        response_body["message"] = message
    if data is not None:
        response_body["data"] = data
        
    return Response(response_body, status=status_code)


def error_response(message, exc=None, status_code=status.HTTP_500_INTERNAL_SERVER_ERROR):
    """
    Standard Error Response Template
    Format:
    {
        "status": "error",
        "message": "...",
        "details": "..." (only in DEBUG)
    }
    """
    if exc:
        log_entry = f"\n[{timezone.now()}] ERROR: {message}\n"
        log_entry += f"Exception: {str(exc)}\n{traceback.format_exc()}\n"
        with open('backend_error_log.txt', 'a') as f:
            f.write(log_entry)
    
    response_body = {
        "status": "error",
        "message": message
    }
    
    if settings.DEBUG and exc:
        response_body["details"] = str(exc)
        response_body["traceback"] = traceback.format_exc()
        
    return Response(response_body, status=status_code)
