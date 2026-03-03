# backend/api/kantata_sync.py
import requests
import base64
import logging
import uuid
import traceback
import time
from urllib.parse import urlparse
import urllib.parse
from django.conf import settings
from django.core.cache import cache
from authentication.kantata_auth import get_kantata_headers
from .services import download_blob_bytes

logger = logging.getLogger(__name__)

CURRENT_USER_EMAIL = getattr(settings, "KANTATA_CURRENT_USER_EMAIL", None)

BASE_ACTIVITY_SOQL = """
    SELECT 
        Id, 
        KimbleOne__Resource__r.Name,
        KimbleOne__ResourcedActivity__r.Name,
        KimbleOne__ResourcedActivity__r.KimbleOne__DeliveryElement__r.Name
    FROM KimbleOne__ActivityAssignment__c 
    WHERE KimbleOne__Resource__r.KimbleOne__User__r.FederationIdentifier = '{user_email}'
"""

def query_salesforce(instance_url, query, headers):
    """Executes SOQL query against Salesforce REST API."""
    # Strip any trailing slash from the instance URL just to be safe
    clean_url = instance_url.rstrip('/') 
    
    # Notice: NO trailing slash after queryAll
    url = f"{clean_url}/services/data/v60.0/queryAll" 
    params = {'q': query}
    
    try:
        resp = requests.get(url, headers=headers, params=params)
        resp.raise_for_status()
        return resp.json().get('records', [])
    except Exception as e:
        print(f"SOQL Query failed: {e}")
        if hasattr(e, 'response') and e.response:
            print(f"Salesforce Error Body: {e.response.text}")
        return []

def check_single_import_status(instance_url, headers, interface_id):
    """
    Polls the Kimble Interface Request object to see the final result of the import.
    Returns the Status and the Notes (Original Message).
    """
    if not instance_url:
        instance_url = headers.pop("Salesforce-Instance-Url", "")
    else:
        headers.pop("Salesforce-Instance-Url", None)
        
    clean_id = interface_id.replace('"', '').strip()
    
    query = f"Select id, name, KimbleOne__ErrorMessage__c, KimbleOne__ObjectId__c, KimbleOne__Status__r.name, KimbleOne__TransformedData__c from KimbleOne__InterfaceRunLine__c where KimbleOne__InterfaceRun__c ='{clean_id}'"
    
    records = query_salesforce(instance_url, query, headers)
    
    if records:
        record = records[0]
        status_node = record.get('KimbleOne__Status__r')
        
        status = None
        if status_node:
            status = status_node.get('Name') or status_node.get('name')
            
        error_message = record.get('KimbleOne__ErrorMessage__c')
        
        if not status:
            status = "Pending"
            
        print(f"Polled {clean_id} | Status: {status} | Error: {error_message}")
        
        return {
            "status": status,
            "message": error_message
        }
        
    print(f"Polled {clean_id} | Line item not created yet. Waiting...")
    return {"status": "Pending", "message": None}

def fetch_all_activity_names(user_email: str):
    """
    Queries Salesforce for all dynamic projects/activities assigned to the user.
    """
    headers = get_kantata_headers()
    instance_url = headers.pop("Salesforce-Instance-Url", getattr(settings, 'KANTATA_INSTANCE_URL', ''))
    
    if not instance_url:
        return []

    query = BASE_ACTIVITY_SOQL.format(user_email=user_email)
    
    url = f"{instance_url}/services/data/v60.0/query/?q={urllib.parse.quote(query.strip())}"

    try:
        response = requests.get(url, headers=headers)
        if response.status_code == 200:
            data = response.json()
            records = data.get("records", [])
            
            activities = []
            for rec in records:
                # Digging into the JSON structure you provided to get the Name
                resourced_activity = rec.get("KimbleOne__ResourcedActivity__r", {})
                if resourced_activity and "Name" in resourced_activity:
                    activities.append(resourced_activity["Name"])
            
            return activities
        else:
            print(f"Salesforce query failed: {response.text}")
            return []
    except Exception as e:
        print(f"Error fetching dynamic activities: {e}")
        return []

def fetch_specific_activity_assignment(instance_url, headers, activity_name_input, expense_date=None):
    
    # Clean inputs to remove invisible whitespace
    clean_activity = activity_name_input.strip()
    safe_activity = clean_activity.replace("'", "\\'")
    user_email = str(CURRENT_USER_EMAIL).strip()

    cache_key = f"specific_activity_{user_email}_{safe_activity}"
    # Replace spaces with underscores to avoid memcached CacheKeyWarning
    cache_key = cache_key.replace(" ", "_") 

    cached_assignment = cache.get(cache_key)
    
    if cached_assignment:
        return cached_assignment

    # Construct the query
    soql = BASE_ACTIVITY_SOQL.format(user_email=user_email) + f"""
        AND (
            KimbleOne__ResourcedActivity__r.Name LIKE '%{safe_activity}%' 
            OR 
            KimbleOne__ResourcedActivity__r.KimbleOne__DeliveryElement__r.Name LIKE '%{safe_activity}%'
        )
    """

    records = query_salesforce(instance_url, soql, headers)
    
    if not records:
        print(f"No active assignment record found for activity: '{clean_activity}' using email: '{user_email}'")
        return None

    print(f"Found Assignment ID: {records[0].get('Id')}")
    
    record = records[0]
    
    try:
        activity_node = record.get('KimbleOne__ResourcedActivity__r')
        if not activity_node:
            return None
            
        delivery_node = activity_node.get('KimbleOne__DeliveryElement__r')
        
        if delivery_node:
            project_name = delivery_node.get('Name')
        else:
            project_name = activity_node.get('Name')
        
        assignment_data = {
            "resource_name": getattr(settings, 'KANTATA_RESOURCE_NAME'),
            "project_name": project_name
        }
        
        # Save to cache for 300 seconds (5 minutes)
        cache.set(cache_key, assignment_data, 300)
        
        return assignment_data
    except Exception as e:
        print(f"Data Parsing Error: {e}")
        traceback.print_exc()
        return None
    
def get_active_exchange_rates():
    """
    Fetches dynamic currencies and their conversion factors from Salesforce.
    Cached for 1 hour for performance. 
    """
    # 1. Check cache first
    cached_rates = cache.get("kantata_exchange_rates")
    if cached_rates:
        return cached_rates
    
    try:
        headers = get_kantata_headers()
        instance_url = headers.pop("Salesforce-Instance-Url", getattr(settings, 'KANTATA_INSTANCE_URL', ''))
        
        query = "Select CurrencyIsoCode, KimbleOne__ConversionFactor__c from KimbleOne__ExchangeRate__c where KimbleOne__EffectiveToDate__c = null"
        records = query_salesforce(instance_url, query, headers)
        
        rates = {}
        if records:
            for r in records:
                rates[r.get('CurrencyIsoCode')] = r.get('KimbleOne__ConversionFactor__c')
        # 2. Save to cache for 3600 seconds (1 hour)
        cache.set("kantata_exchange_rates", rates, 3600)
        return rates        
        
    except Exception as e:
        print(f"Kantata Auth or Fetch failed for exchange rates: {e}")
        # Return empty dict so the LLM falls back to schemas.CURRENCIES without crashing
        return {}

def sync_group_to_kantata(group_data):
    """
    Syncs a single Activity Group object to Kantata.
    """
    try:
        # 1. Auth & Setup
        headers = get_kantata_headers()
        instance_url = headers.pop("Salesforce-Instance-Url", "")  # Remove URL from headers to use separately
        
        if not instance_url:
            return {"status": "error", "message": "Failed to retrieve Instance URL from Auth"}

        # 2. Extract Group Info (Handle object vs dict access)
        if hasattr(group_data, 'activity_name'):
            activity_name = group_data.activity_name
            expenses = group_data.expenses
        else:
            activity_name = group_data.get('activity_name', "Unassigned")
            expenses = group_data.get('expenses', [])

        # 3. Get Kantata Assignment
        assignment_meta = fetch_specific_activity_assignment(instance_url, headers, activity_name)
        
        if not assignment_meta:
            return {
                "status": "skipped",
                "activity": activity_name,
                "reason": f"Could not find valid Kantata assignment for '{activity_name}'"
            }

        final_payload = []

        # 4. Process Expenses
        for expense in expenses:
            # Handle Object vs Dict access for expense item
            if hasattr(expense, 'blob_name'):
                blob_name = expense.blob_name
                total_amount = expense.total_amount
                category = expense.category
                date_val = expense.date
                currency = expense.currency
            else:
                blob_name = expense.get('blob_name')
                total_amount = expense.get('total_amount')
                category = expense.get('category')
                date_val = expense.get('date')
                currency = expense.get('currency')

            # --- DYNAMIC FILE TYPE LOGIC START ---
            file_ext = "jpg" # Default fallback
            clean_filename = "receipt.jpg"

            if blob_name:
                # If blob_name is a URL or path, clean it to get just the filename
                if "/" in blob_name:
                    clean_filename = urlparse(blob_name).path.split('/')[-1]
                else:
                    clean_filename = blob_name
                
                # Extract extension dynamically
                if "." in clean_filename:
                    file_ext = clean_filename.split('.')[-1].lower()
                    if file_ext == "jpeg": file_ext = "jpg"
            # --- DYNAMIC FILE TYPE LOGIC END ---

            # Download Blob Content
            file_b64 = ""
            if blob_name:
                file_bytes = download_blob_bytes(blob_name)
                if file_bytes:
                    file_b64 = base64.b64encode(file_bytes).decode('utf-8')

            # Construct Payload
            payload_item = {
                "category": category,
                "expenseitemtype": "EmployeePaid",
                "amount": str(total_amount or 0),
                "currency": currency or 'GBP',
                "date": date_val,
                "resource": getattr(settings, 'KANTATA_RESOURCE_NAME'),
                "project": assignment_meta['project_name'],
                "FileType": file_ext, 
                "FileName": clean_filename,
                "externalid": f"EXP-{uuid.uuid4().hex[:16]}",
                "KC_ImportedExpense__c": True,  
                "KC_IsReceipted__c": True,   
                "FileContents": file_b64
            }
            final_payload.append(payload_item)
            # print(final_payload)

        if not final_payload:
            return {"status": "empty", "message": "No valid expenses generated"}

        # 5. POST to Kantata
        endpoint = f"{instance_url}/services/apexrest/KimbleOne/v1.0/Import/ExpenseItemImportReceiptsJson"
        
        print(f"Sending {len(final_payload)} items to Kantata for {activity_name}...")

        try:
            response = requests.post(endpoint, json=final_payload, headers=headers)
            print(response)
            
            if response.status_code == 200:
                clean_id = response.text.replace('"', '').strip()
                print(f"Success! Run ID: {clean_id}. Returning to frontend immediately...")
                
                base_target = getattr(settings, 'TARGET_URL', '')
                target_url = f"{base_target}{clean_id}" if base_target else None
                
                return {
                    "status": "success",
                    "activity": activity_name,
                    "interface_run_id": clean_id,
                    "target_url": target_url,
                    "import_status": "Pending",
                    "import_message": None   
                }
            else:
                return {
                    "status": "failed",
                    "activity": activity_name,
                    "code": response.status_code,
                    "error": response.text
                }
                
        except Exception as e:
            traceback.print_exc()
            return {"status": "error", "message": str(e)}
    except Exception as e:
        traceback.print_exc()
        return {"status": "error", "message": str(e)}    