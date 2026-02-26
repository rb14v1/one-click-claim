# backend/authentication/kantata_auth.py
import jwt
import requests
import logging
from datetime import datetime, timedelta, timezone
from django.conf import settings

logger = logging.getLogger(__name__)

def get_oauth_token(grant_type, assertion, token_url):
    """Post request to Salesforce to get the Access Token."""
    form_data = {
        "grant_type": grant_type,
        "assertion": assertion
    }
    headers = {"Content-Type": "application/x-www-form-urlencoded"}

    response = requests.post(token_url, data=form_data, headers=headers)
    if response.status_code != 200:
        print(f"SALESFORCE AUTH ERROR: {response.text}")
    response.raise_for_status()
    return response.json()

def get_kantata_headers():
    """
    Generates JWT, authenticates with Salesforce, and returns Headers + Instance URL.
    """
    client_id = getattr(settings, 'KANTATA_CLIENT_ID')
    username = getattr(settings, 'KANTATA_USERNAME')
    private_key_path = getattr(settings, 'KANTATA_PRIVATE_KEY_PATH')
    token_url = getattr(settings, 'TOKEN_URL')
    audience = getattr(settings, 'SALESFORCE_JWT_AUD')

    try:
        with open(private_key_path, 'r') as f:
            private_key = f.read()
    except FileNotFoundError:
        logger.error(f"Private Key file not found at: {private_key_path}")
        raise Exception("Private Key file missing.")

    # Build JWT Payload
    ep = datetime(1970, 1, 1, 0, 0, 0, tzinfo=timezone.utc)
    expiry_date = datetime.now(timezone.utc) + timedelta(hours=1) 
    expiry_time = (expiry_date - ep).total_seconds()

    claim = {
        "iss": client_id,
        "sub": username,
        "aud": audience, 
        "exp": int(expiry_time)
    }

    encoded_jwt = jwt.encode(claim, private_key, algorithm='RS256')

    try:
        data = get_oauth_token(
            grant_type="urn:ietf:params:oauth:grant-type:jwt-bearer",
            assertion=encoded_jwt,
            token_url=token_url
        )
        access_token = data.get("access_token")
        instance_url = data.get("instance_url")

        # --- Explicitly Print as requested ---
        print("\n SALESFORCE ACCESS TOKEN")
        print(access_token)
        print("\nINSTANCE URL")
        print(instance_url)
        # -------------------------------------

        return {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json",
            "Salesforce-Instance-Url": instance_url
        }
        
    except Exception as e:
        logger.error(f"Kantata Auth Failed: {str(e)}")
        raise e