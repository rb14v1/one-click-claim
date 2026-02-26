"""
Azure AD JWT Token Validator.

This module validates JWT tokens issued by Azure AD for SSO authentication.
It fetches Microsoft's public keys (JWKS), verifies token signatures,
and extracts user claims.

Usage:
    validator = get_token_validator()  # Returns singleton instance
    try:
        claims = validator.validate_token(token)
        user_info = validator.extract_user_info(claims)
    except AuthError as e:
        # Handle authentication error
        pass
"""

import base64
import json
import logging
import time
from typing import Any
from urllib.request import urlopen

import jwt
from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric.rsa import RSAPublicNumbers
from django.conf import settings

logger = logging.getLogger(__name__)


class AuthError(Exception):
    """
    Custom exception for authentication errors.
    
    Attributes:
        error: Dictionary containing error code and description.
        status_code: HTTP status code to return.
    """
    
    def __init__(self, error: dict, status_code: int) -> None:
        """
        Initialize AuthError.
        
        Args:
            error: Dictionary with 'code' and 'description' keys.
            status_code: HTTP status code (401, 403, 500, etc.).
        """
        super().__init__(error.get('description', 'Authentication error'))
        self.error = error
        self.status_code = status_code

    def __str__(self) -> str:
        return f"AuthError({self.error.get('code')}: {self.error.get('description')})"


class AzureADTokenValidator:
    """
    Validates JWT tokens issued by Azure AD.
    
    This class handles:
    - Fetching and caching Microsoft's JWKS (JSON Web Key Set)
    - Converting JWK to PEM format for signature verification
    - Validating token signature, issuer, audience, and expiration
    - Extracting user claims from validated tokens
    
    Note:
        Use get_token_validator() to get the singleton instance instead of
        instantiating this class directly.
    
    Attributes:
        tenant_id: Azure AD tenant ID.
        client_id: Azure AD application (client) ID.
        jwks_cache_ttl: Time-to-live for JWKS cache in seconds.
    """
    
    # Class-level cache for JWKS to avoid fetching on every request
    _jwks_cache: dict | None = None
    _jwks_cache_time: float | None = None
    
    # Singleton instance
    _instance: "AzureADTokenValidator | None" = None
    
    def __init__(self) -> None:
        """
        Initialize the token validator with Azure AD configuration.
        
        Raises:
            AuthError: If required Azure AD configuration is missing.
        """
        self.tenant_id = self._get_config('AZURE_TENANT_ID')
        self.client_id = self._get_config('AZURE_CLIENT_ID')
        self.jwks_cache_ttl = getattr(settings, 'AZURE_JWKS_CACHE_TTL', 3600)  # 1 hour default
        
        # Construct Azure AD endpoints
        self.jwks_url = f"https://login.microsoftonline.com/{self.tenant_id}/discovery/v2.0/keys"
        self.issuer = f"https://login.microsoftonline.com/{self.tenant_id}/v2.0"
        
        # Support both plain client_id and api:// format audiences
        self.audiences = [
            self.client_id,
            f"api://{self.client_id}"
        ]

    def _get_config(self, key: str) -> str:
        """
        Get configuration value from Django settings or environment.
        
        Args:
            key: Configuration key name.
            
        Returns:
            Configuration value.
            
        Raises:
            AuthError: If configuration is missing.
        """
        # Try AZURE_AD_CONFIG dict first, then direct settings
        azure_config = getattr(settings, 'AZURE_AD_CONFIG', {})
        value = azure_config.get(key.replace('AZURE_', '').replace('_ID', '_ID').replace('TENANT', 'TENANT'))
        
        if not value:
            # Try direct attribute
            value = getattr(settings, key, None)
        
        if not value:
            # Try environment variable via settings
            import os
            value = os.getenv(key)
        
        if not value:
            logger.error(f"Missing required configuration: {key}")
            raise AuthError(
                {"code": "config_error", "description": f"{key} not configured"},
                500
            )
        
        return value

    def get_jwks(self) -> dict:
        """
        Fetch and cache Microsoft's JSON Web Key Set (JWKS).
        
        The JWKS contains the public keys used to sign JWT tokens.
        Azure AD rotates these keys periodically, so we cache them
        with a configurable TTL.
        
        Returns:
            Dictionary containing the JWKS data.
            
        Raises:
            AuthError: If JWKS cannot be fetched.
        """
        current_time = time.time()
        
        # Return cached JWKS if still valid
        if (
            AzureADTokenValidator._jwks_cache is not None
            and AzureADTokenValidator._jwks_cache_time is not None
            and current_time - AzureADTokenValidator._jwks_cache_time < self.jwks_cache_ttl
        ):
            logger.debug("Using cached JWKS")
            return AzureADTokenValidator._jwks_cache
        
        # Fetch fresh JWKS
        logger.info(f"Fetching JWKS from {self.jwks_url}")
        try:
            response = urlopen(self.jwks_url, timeout=10)
            jwks_data = json.loads(response.read())
            
            # Update cache
            AzureADTokenValidator._jwks_cache = jwks_data
            AzureADTokenValidator._jwks_cache_time = current_time
            
            logger.info(f"JWKS fetched successfully, {len(jwks_data.get('keys', []))} keys found")
            return jwks_data
            
        except Exception as e:
            logger.error(f"Failed to fetch JWKS: {e}")
            raise AuthError(
                {"code": "jwks_error", "description": "Failed to fetch signing keys from Azure AD"},
                500
            )

    def _clear_jwks_cache(self) -> None:
        """Clear the JWKS cache to force a refresh."""
        AzureADTokenValidator._jwks_cache = None
        AzureADTokenValidator._jwks_cache_time = None
        logger.debug("JWKS cache cleared")

    @staticmethod
    def _ensure_bytes(key: str | bytes) -> bytes:
        """
        Ensure key is in bytes format.
        
        Args:
            key: String or bytes to convert.
            
        Returns:
            Bytes representation of the key.
        """
        if isinstance(key, str):
            return key.encode('utf-8')
        return key

    @staticmethod
    def _decode_base64url_to_int(value: str) -> int:
        """
        Decode base64url-encoded value to integer for JWK parsing.
        
        Args:
            value: Base64url-encoded string.
            
        Returns:
            Decoded integer value.
        """
        # Add padding if necessary
        decoded = base64.urlsafe_b64decode(
            AzureADTokenValidator._ensure_bytes(value) + b'=='
        )
        return int.from_bytes(decoded, 'big')

    def _jwk_to_pem(self, jwk: dict) -> bytes:
        """
        Convert JSON Web Key (JWK) to RSA PEM public key.
        
        Azure AD provides public keys in JWK format. This function converts
        them to PEM format that PyJWT can use for signature verification.
        
        Args:
            jwk: Dictionary containing JWK data with 'n' and 'e' fields.
            
        Returns:
            PEM-encoded public key bytes.
        """
        return RSAPublicNumbers(
            n=self._decode_base64url_to_int(jwk['n']),
            e=self._decode_base64url_to_int(jwk['e'])
        ).public_key(default_backend()).public_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PublicFormat.SubjectPublicKeyInfo
        )

    def get_public_key(self, kid: str) -> bytes:
        """
        Get the public key for a specific Key ID (kid).
        
        Args:
            kid: Key ID from the JWT header.
            
        Returns:
            PEM-encoded public key bytes.
            
        Raises:
            AuthError: If the key is not found.
        """
        jwks = self.get_jwks()
        
        # Find the matching key
        jwk = next((key for key in jwks.get("keys", []) if key.get("kid") == kid), None)
        
        if jwk is None:
            # Key not found - might be rotated, clear cache and retry once
            logger.warning(f"Key {kid} not found in JWKS, clearing cache and retrying")
            self._clear_jwks_cache()
            jwks = self.get_jwks()
            jwk = next((key for key in jwks.get("keys", []) if key.get("kid") == kid), None)
            
            if jwk is None:
                logger.error(f"Key {kid} not found in JWKS after refresh")
                raise AuthError(
                    {"code": "invalid_header", "description": "Unable to find appropriate signing key"},
                    401
                )
        
        return self._jwk_to_pem(jwk)

    def validate_token(self, token: str) -> dict:
        """
        Decode and validate JWT token from Azure AD.
        
        Validation steps:
        1. Extract key ID (kid) from token header
        2. Fetch matching public key from Azure AD JWKS endpoint
        3. Verify signature using RS256 algorithm
        4. Validate issuer (must be Azure AD for our tenant)
        5. Validate audience (must be our app's client ID)
        6. Check expiration (handled automatically by PyJWT)
        
        Args:
            token: JWT token string (without "Bearer " prefix).
            
        Returns:
            Decoded token payload containing claims.
            
        Raises:
            AuthError: If token is invalid, expired, or has incorrect claims.
        """
        # Get the key ID from token header (unverified)
        try:
            unverified_header = jwt.get_unverified_header(token)
        except jwt.exceptions.DecodeError as e:
            logger.warning(f"Failed to decode token header: {e}")
            raise AuthError(
                {"code": "invalid_token", "description": "Token is malformed"},
                401
            )
        
        kid = unverified_header.get('kid')
        if not kid:
            logger.warning("Token header missing 'kid' field")
            raise AuthError(
                {"code": "invalid_header", "description": "Token header missing key ID"},
                401
            )
        
        # Get the public key and validate the token
        public_key = self.get_public_key(kid)
        
        try:
            payload = jwt.decode(
                token,
                public_key,
                algorithms=["RS256"],
                audience=self.audiences,
                issuer=self.issuer,
                options={
                    "verify_signature": True,
                    "verify_exp": True,
                    "verify_nbf": True,
                    "verify_iat": True,
                    "verify_aud": True,
                    "verify_iss": True,
                    "require": ["exp", "iat", "aud", "iss"]
                }
            )
            self.log_application_insights(payload)
            logger.info(f"Token validated successfully for user: {payload.get('preferred_username', 'unknown')}")
            return payload
        except jwt.ExpiredSignatureError:
            logger.warning("Token has expired")
            raise AuthError(
                {"code": "token_expired", "description": "Token has expired"},
                401
            )
        except jwt.InvalidTokenError as e:
            # Catches all JWT validation errors: InvalidAudienceError, InvalidIssuerError, etc.
            logger.warning(f"Invalid token: {e}")
            raise AuthError(
                {"code": "invalid_token", "description": self._get_token_error_message(e)},
                401
            )

    def log_application_insights(self, payload):
        """
        Attach token user info to the current span so it appears as custom
        properties on the request in Application Insights.
        """
        try:
            from opentelemetry import trace

            span = trace.get_current_span()
            if not (span and span.is_recording()):
                return

            username = payload.get("preferred_username") or payload.get("upn") or "unknown"

            span.set_attribute("username", username)
        except Exception as e:
            logger.debug("Failed to set token payload custom properties", exc_info=e)


    def _get_token_error_message(self, error: jwt.InvalidTokenError) -> str:
        """
        Get user-friendly error message for JWT validation errors.
        
        Args:
            error: JWT validation exception.
            
        Returns:
            User-friendly error description.
        """
        if isinstance(error, jwt.InvalidAudienceError):
            return "Token audience does not match"
        if isinstance(error, jwt.InvalidIssuerError):
            return "Token issuer is not trusted"
        return "Unable to validate authentication token"

    def extract_user_info(self, claims: dict) -> dict[str, Any]:
        """
        Extract relevant user information from token claims.
        
        Args:
            claims: Decoded token payload from validate_token().
            
        Returns:
            Dictionary containing:
                - email: User's email address
                - name: User's display name
                - object_id: Azure AD object ID (unique identifier)
                - roles: List of assigned app roles
                - tenant_id: Azure AD tenant ID
        """
        return {
            "email": claims.get("preferred_username") or claims.get("email") or claims.get("upn"),
            "name": claims.get("name", ""),
            "object_id": claims.get("oid"),
            "roles": claims.get("roles", []),
            "tenant_id": claims.get("tid"),
        }


# Module-level singleton accessor
_validator_instance: AzureADTokenValidator | None = None


def get_token_validator() -> AzureADTokenValidator:
    """
    Get the singleton instance of AzureADTokenValidator.
    
    This function ensures only one validator instance exists throughout
    the application lifecycle, avoiding unnecessary object creation
    and ensuring the JWKS cache is properly shared.
    
    Returns:
        The singleton AzureADTokenValidator instance.
        
    Example:
        validator = get_token_validator()
        claims = validator.validate_token(token)
    """
    global _validator_instance
    if _validator_instance is None:
        _validator_instance = AzureADTokenValidator()
    return _validator_instance
