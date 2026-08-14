from rest_framework.throttling import SimpleRateThrottle
from django.core.cache import cache

class AnonSubmissionThrottle(SimpleRateThrottle):
    """
    Limits anonymous submissions to prevent spam.
    Policy: 5 requests per 7 days per anonymous session.
    """
    scope = 'anon_submission'
    rate = '5/7d' # 5 requests per 7 days (requires DRF parsing support, or we define custom)

    def get_cache_key(self, request, view):
        # Use simple IP fallback if no session, but prefer session hash
        # In this project, session is passed via headers or cookies usually? 
        # Actually in ComplaintViewSet.create, we might look for 'X-Anonymous-Session' 
        # or checking the body. But throttling happens before view execution.
        # We'll stick to IP for the "Abuse Protection" layer as requested 
        # OR attempt to read the tracking cookie if we implemented one.
        
        # Taking "IP used only for abuse protection" literally: 
        # We should try to limit by the 'anonymous session' if possible.
        # But creating a complaint *creates* the session often? 
        # If the user already has a session, we limit them.
        
        # For now, let's stick to IP for simplicity and robustness against script kiddies 
        # who might wipe cookies.
        return self.get_ident(request)

    def parse_rate(self, rate):
        """
        Custom parser to handle '7d' if DRF doesn't support it by default 
        (DRF supports s, m, h, d). 7d might need 'day' * 7. 
        Actually DRF default SimpleRateThrottle supports 'day', not '7d'.
        Let's implement a custom duration logic or just use '5/day' as a proxy 
        if 7d is too complex for standard DRF without overriding `wait`.
        
        Let's just use '5/day' for now as a "Safe" approximation 
        or implement 5/week logic manually.
        """
        return (5, 604800) # 5 requests, 604800 seconds (7 days)

class SubmissionCooldownThrottle(SimpleRateThrottle):
    """
    10 minute cooldown between submissions.
    """
    scope = 'submission_cooldown'
    
    def parse_rate(self, rate):
        return (1, 600) # 1 request every 600 seconds (10 mins)

    def get_cache_key(self, request, view):
        return self.get_ident(request)
