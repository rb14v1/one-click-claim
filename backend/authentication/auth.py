# backend/authentication/auth.py

import logging
from django.contrib.auth import get_user_model
from django.http import HttpRequest
from ninja.security import HttpBearer
from authentication.azure_auth import get_token_validator, AuthError

# Try to import UserProfile, handle gracefully if it doesn't exist yet
try:
    from api.schemas import UserProfile
except ImportError:
    UserProfile = None

logger = logging.getLogger(__name__)
User = get_user_model()

class AzureBearer(HttpBearer):
    """
    Django Ninja Authenticator for Azure AD.
    1. Validates JWT.
    2. Performs JIT User Provisioning (creates user if not exists).
    3. Returns the User object.
    """
    
    def authenticate(self, request: HttpRequest, token: str):
        if not token:
            return None
            
        try:
            # 1. Validate Token
            validator = get_token_validator()
            claims = validator.validate_token(token)
            user_info = validator.extract_user_info(claims)
            
            # 2. JIT Provisioning (Get or Create User)
            user = self._get_or_create_user(user_info)
            
            # 3. Return User (Ninja attaches this to request.auth)
            return user
            
        except AuthError as e:
            logger.warning(f"Azure Auth Failed: {e}")
            return None # Returns 401
        except Exception as e:
            logger.error(f"Unexpected Auth Error: {e}")
            return None
