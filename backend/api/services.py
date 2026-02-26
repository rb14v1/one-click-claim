# backend/api/services.py
import json
import mimetypes
from azure.storage.blob import BlobServiceClient, generate_blob_sas, BlobSasPermissions, ContentSettings
from azure.ai.formrecognizer import DocumentAnalysisClient
from azure.core.credentials import AzureKeyCredential
from openai import AzureOpenAI
from django.conf import settings
from datetime import datetime, timedelta
from .schemas import (
    ACTIVITIES, TAX_RATES, CURRENCIES,
    CAT_GROUP_MILEAGE, CAT_GROUP_ATTENDEES,
    CAT_GROUP_TRANSPORT_LOC, CAT_GROUP_STANDARD
)
 
# --- Clients Setup ---
blob_service_client = BlobServiceClient.from_connection_string(getattr( settings, 'AZURE_CONNECTION_STRING'))
container_client = blob_service_client.get_container_client(getattr( settings, 'AZURE_CONTAINER_NAME'))
 
doc_client = DocumentAnalysisClient(
    endpoint= getattr(settings, 'AZURE_DOC_ENDPOINT'),
    credential=AzureKeyCredential( getattr(settings, 'AZURE_DOC_KEY'))
)
 
openai_client = AzureOpenAI(
    azure_endpoint= getattr(settings, 'AZURE_OPENAI_ENDPOINT'),
    api_key= getattr(settings, 'AZURE_OPENAI_API_KEY'),
    api_version= getattr(settings, 'AZURE_OPENAI_API_VERSION')
)
 
def upload_file_to_blob(file, filename: str):
    blob_client = container_client.get_blob_client(filename)
    
    # Detect Content Type
    content_type_val = "application/octet-stream"
    if filename.lower().endswith(".pdf"):
        content_type_val = "application/pdf"
    elif filename.lower().endswith(".png"):
        content_type_val = "image/png"
    elif filename.lower().endswith((".jpg", ".jpeg")):
        content_type_val = "image/jpeg"

    # Set ContentSettings so Azure knows what file this is
    my_content_settings = ContentSettings(content_type=content_type_val)

    blob_client.upload_blob(file, overwrite=True, content_settings=my_content_settings)
    return blob_client.url

def extract_text_from_bytes(file_bytes: bytes) -> str:
    """Run OCR directly on file bytes without a Blob URL."""
    # Use begin_analyze_document (NOT _from_url)
    poller = doc_client.begin_analyze_document("prebuilt-read", document=file_bytes)
    return poller.result().content
 
def download_blob_bytes(blob_name: str) -> bytes:
    """
    Fetches the actual image file from Azure Blob Storage as bytes.
    Used by the Bot to create a temporary local file for upload.
    """
    try:
        print(f"   Downloading blob: {blob_name}")
        blob_client = container_client.get_blob_client(blob_name)
        return blob_client.download_blob().readall()
    except Exception as e:
        print(f"   Error downloading blob {blob_name}: {e}")
        return None
 
def generate_sas_url(filename: str) -> str:
    # 1. Guess the MIME type based on extension
    mime_type, _ = mimetypes.guess_type(filename)
    if not mime_type:
        mime_type = "application/octet-stream"
    
    # 2. Force that MIME type in the SAS token
    sas_token = generate_blob_sas(
        account_name=blob_service_client.account_name,
        container_name= getattr(settings, 'AZURE_CONTAINER_NAME'),
        blob_name=filename,
        account_key=blob_service_client.credential.account_key,
        permission=BlobSasPermissions(read=True),
        expiry=datetime.utcnow() + timedelta(minutes=20),
        content_disposition="inline", 
        content_type=mime_type  
    )
    return f"https://{blob_service_client.account_name}.blob.core.windows.net/{ getattr(settings, 'AZURE_CONTAINER_NAME')}/{filename}?{sas_token}"
 
def extract_text_from_receipt(sas_url: str) -> str:
    poller = doc_client.begin_analyze_document_from_url("prebuilt-read", sas_url)
    return poller.result().content
 
def analyze_with_llm(ocr_text: str, valid_currencies: list = CURRENCIES):
    # Constructing the logic map to feed the AI
    # This tells the AI: "If you pick a category from List A, you MUST get these fields."
   
    logic_map = {
        "GROUP_MILEAGE": {
            "categories": CAT_GROUP_MILEAGE,
            "required_fields": ["mileage", "start_location", "end_location"],
            "ignored_fields": ["total_amount", "tax_rate", "attendees"]
        },
        "GROUP_ATTENDEES": {
            "categories": CAT_GROUP_ATTENDEES,
            "required_fields": ["total_amount", "tax_rate", "attendees"],
            "ignored_fields": ["mileage", "start_location", "end_location"]
        },
        "GROUP_TRANSPORT_LOC": {
            "categories": CAT_GROUP_TRANSPORT_LOC,
            "required_fields": ["total_amount", "tax_rate", "start_location", "end_location"],
            "ignored_fields": ["mileage", "attendees"]
        },
        "GROUP_STANDARD": {
            "categories": CAT_GROUP_STANDARD,
            "required_fields": ["total_amount", "tax_rate"],
            "ignored_fields": ["mileage", "start_location", "end_location", "attendees"]
        }
    }
 
    system_prompt = f"""
    You are an expert data entry AI. Analyze the text and extract data for ONE OR MORE receipts found in the image text.
    
    **VALIDATION RULE:**
    Check if the text represents a valid financial receipt or invoice.
    - If it is junk, random text, or not a receipt, return: {{ "is_receipt": false, "receipts": [] }}
    - If valid, return: {{ "is_receipt": true, "receipts": [...] }}
    
    **GLOBAL LISTS:**
    - Activities: {json.dumps(ACTIVITIES)}
    - Currencies: {json.dumps(valid_currencies)}
    - Tax Rates: {json.dumps(TAX_RATES)}
 
    **LOGIC:**
    {json.dumps(logic_map, indent=2)}
 
    **OUTPUT RULES:**
    1. The input text may contain MULTIPLE distinct receipts (e.g., a lunch receipt and a taxi receipt in the same scan).
    2. You must return a JSON object with a single key: "receipts".
    3. For EACH receipt:
       - **CRITICAL: You MUST select the most relevant option from the 'Activities' list above. If the receipt text doesn't clearly match a specific activity, choose the one that fits 'Employee Led Training' or similar if available, otherwise pick the closest fit.**
       - **report_name**: Generate a short, professional, valid name for this report based on the context. 
         (e.g., 'Oct Team Lunch', 'Client Dinner - Google', 'Q3 Office Supplies'). 
         It must be specific to the event/merchant but professional.
       - Extract the 'category' based on the LOGIC map.
       - Extract 'merchant_name', 'total_amount', 'date' (MUST BE in YYYY-MM-DD format), etc.
    4. For EACH receipt, strictly follow the category mapping logic above.
    5. If a required field is missing, set it to null.
   
    Example Output Structure:
    {{
        "receipts": [
            {{ 
                "activity": "Conference",
                "report_name": "Tech Summit Expenses",  
                "merchant_name": "Starbucks", 
                "total_amount": 5.50, 
                "category": "Food: Breakfast or Lunch...",
                ... 
            }}
        ]
    }}
    """
 
    response = openai_client.chat.completions.create(
        model= getattr(settings, 'AZURE_OPENAI_DEPLOYMENT'),
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Receipt Text: {ocr_text}"}
        ],
        temperature=0.0,
        response_format={"type": "json_object"}
    )
    
    # Parse the response and return the LIST of receipts
    data = json.loads(response.choices[0].message.content)
    return { "is_valid": data.get("is_receipt", False),
            "receipts": data.get("receipts", [])
            }
 
def process_receipt_pipeline(file_data, filename: str, valid_currencies: list = CURRENCIES):
    try:
        # 1. OCR directly from memory (No Blob yet!)
        print(f"Extracting text from memory for {filename}...")
        raw_text = extract_text_from_bytes(file_data)
        
        # 2. LLM Check
        print(f"Validating & Mapping data for {filename}...")
        analysis_result = analyze_with_llm(raw_text, valid_currencies)
        
        # GATEKEEPER: If invalid, STOP here.
        if not analysis_result["is_valid"]:
            print(f"Skipping {filename}: Not a valid receipt.")
            return [{"error": "Invalid file: Not a recognized receipt", "filename": filename}]

        # 3. IT IS VALID! Now we persist to Blob Storage.
        print(f"Valid receipt detected. Uploading {filename}...")
        upload_file_to_blob(file_data, filename)
        
        receipts_list = analysis_result["receipts"]
       
        # Attach the filename to every receipt
        for receipt in receipts_list:
            receipt['blob_name'] = filename
       
        return receipts_list 
 
    except Exception as e:
        print(f"Error processing {filename}: {str(e)}")
        return [{"error": str(e), "filename": filename}]
 