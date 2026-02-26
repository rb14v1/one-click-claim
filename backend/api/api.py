# backend/api/api.py
from ninja import NinjaAPI, File
from ninja.files import UploadedFile
from typing import List
from django.conf import settings
from math import ceil
import uuid
from itertools import groupby
from .services import process_receipt_pipeline, generate_sas_url
from .schemas import ClaimSubmissionSchema, GroupedReceiptsResponse, KPISchema, GraphPoint, CategoryStat
from django.db.models import Count, Sum, DecimalField, Q
from django.db.models.functions import TruncDay, TruncWeek, TruncMonth, Coalesce
from .models import ClaimSubmission, ExpenseItem, User
from .kantata_sync import sync_group_to_kantata, check_single_import_status, get_active_exchange_rates
from authentication.kantata_auth import get_kantata_headers
from django.core.paginator import Paginator
from django.utils import timezone
from datetime import timedelta
 
api = NinjaAPI()
 
# --- FUNCTION FOR DATE RANGES ---
def get_date_limit(range_str):
    now = timezone.now()
    if range_str == "day":
        return now - timedelta(days=1)
    elif range_str == "week":
        return now - timedelta(weeks=1)
    elif range_str == "month":
        return now - timedelta(days=30)
    elif range_str == "quarter":
        return now - timedelta(days=90)
    elif range_str == "all":
        return None
    return None
 
api = NinjaAPI()
 
@api.post("/process-receipts", response=GroupedReceiptsResponse)
def process_receipts(request, files: List[UploadedFile] = File(...)):
    
    valid_results = []
    rejected_files = []
   
   # FETCH DYNAMIC CURRENCIES FOR THE LLM 
    exchange_rates = get_active_exchange_rates()
    # Fallback to schema currencies if Kantata fails
    dynamic_currencies = list(exchange_rates.keys()) if exchange_rates else None
    # 1. Process files and Split results
    for file in files:
        # Split from the right side to perfectly separate the extension from the name
        if '.' in file.name:
            base_name, ext = file.name.rsplit('.', 1)
            # Slap a short 8-character UUID to the end to prevent blob collisions
            unique_filename = f"{base_name}_{uuid.uuid4().hex[:8]}.{ext}"
        else:
            # Fallback just in case the file has no extension
            unique_filename = f"{file.name}_{uuid.uuid4().hex[:8]}"
       
        # Run pipeline
        pipeline_results = process_receipt_pipeline(file.read(), unique_filename, dynamic_currencies)
        
        # Check if the result is an error or valid receipts
        if pipeline_results and "error" in pipeline_results[0]:
            print(f"Rejecting {file.name}: {pipeline_results[0]['error']}")
            rejected_files.append({
                "filename": file.name,
                "reason": pipeline_results[0]['error']
            })
        else:
            valid_results.extend(pipeline_results)

    # 2. Sort and Group
    valid_results.sort(key=lambda x: (x.get('activity') or 'Unassigned'))
   
    grouped_groups = []
    MAX_ITEMS_PER_GROUP = 15
    
    # 3. Group by Activity
    for activity, items in groupby(valid_results, key=lambda x: (x.get('activity') or 'Unassigned')):
        all_expense_list = list(items)
        
        # 4. CHUNK LOGIC: Split large groups into smaller chunks of 15
        # This loop runs for 0, 15, 30, 45...
        for i in range(0, len(all_expense_list), MAX_ITEMS_PER_GROUP):
            
            # Slice the list (e.g., 0 to 15, then 15 to 30)
            chunk_expenses = all_expense_list[i : i + MAX_ITEMS_PER_GROUP]
            
            # Calculate total ONLY for this specific chunk
            chunk_total = sum(
                float(item.get('total_amount') or 0) 
                for item in chunk_expenses 
                if item.get('total_amount')
            )
            
            # Determine Report Name
            first_report_name = chunk_expenses[0].get('report_name')
            final_report_name = first_report_name if first_report_name else activity
            
            # Clean and format expenses for the response
            clean_expenses = []
            for item in chunk_expenses:
                # Generate SAS URL
                sas_url = generate_sas_url(item['blob_name'])
                
                attendees_val = item.get('attendees')
                if attendees_val is not None:
                    attendees_val = str(attendees_val)

                desc = item.get('description')
                if not desc:
                    merch = item.get('merchant_name') or "Unknown Merchant"
                    cat = item.get('category') or "Expense"
                    cat_short = cat.split('-')[0].strip() 
                    desc = f"{cat_short} at {merch}"                

                clean_expenses.append({
                    "blob_name": item['blob_name'],
                    "blob_url": sas_url,
                    "report_name": item.get('report_name'),
                    "date": item.get('date'),
                    "category": item.get('category'),
                    "currency": item.get('currency'),
                    "description": desc,
                    "merchant_name": item.get('merchant_name'),
                    "total_amount": item.get('total_amount'),
                    "tax_rate": item.get('tax_rate'),
                    "mileage": item.get('mileage'),
                    "attendees": attendees_val,
                    "start_location": item.get('start_location'),
                    "end_location": item.get('end_location')
                })
            
            # Add this "Chunk" as a separate group to the response
            grouped_groups.append({
                "activity_name": activity, 
                "report_name": final_report_name,
                "total_activity_cost": round(chunk_total, 2),
                "expenses": clean_expenses
            })
 
    return {
        "groups": grouped_groups,
        "rejected": rejected_files
    }
    
@api.post("/submit-claim")
def submit_claim(request, payload: ClaimSubmissionSchema):
    """
    Saves the claim to the local DB for analytics AND syncs it to Kantata.
    Updates the local status based on the sync result.
    Ensures no single Kantata request exceeds 15 items.
    """
    # 1. Validate Payload
    if not payload.groups:
        return {"status": "error", "message": "No expense groups provided"}

    try:
        # 2. Get User
        db_user = User.objects.first()
        if not db_user:
            return {"status": "error", "message": "No users found. Run 'python manage.py createsuperuser' first."}

        # --- STEP A: PREPARE DB SUMMARY DATA ---
        total_receipts = 0
        currency_totals = {}
        category_breakdown = {}

        for group in payload.groups:
            for expense in group.expenses:
                total_receipts += 1
                curr = expense.currency or "GBP"
                amt = float(expense.total_amount or 0.0)
                currency_totals[curr] = currency_totals.get(curr, 0) + amt
                cat = expense.category or "Uncategorized"
                category_breakdown[cat] = category_breakdown.get(cat, 0) + 1

        # --- STEP B: CREATE PENDING SUBMISSION IN DB ---
        submission = ClaimSubmission.objects.create(
            user=db_user,
            total_receipts_count=total_receipts,
            categories_breakdown=category_breakdown,
            total_amounts_by_currency=currency_totals,
            status='PENDING'
        )

        # --- STEP C: SAVE INDIVIDUAL EXPENSES TO DB ---
        account_name = getattr(settings, 'AZURE_ACCOUNT_NAME', 'mystorageaccount') 
        container_name = getattr(settings, 'AZURE_CONTAINER_NAME', 'receipts')

        for group in payload.groups:
            activity = group.activity_name
            for expense in group.expenses:
                if expense.blob_url and "http" in expense.blob_url:
                    final_blob_url = expense.blob_url
                else:
                    final_blob_url = f"https://{account_name}.blob.core.windows.net/{container_name}/{expense.blob_name}"

                ExpenseItem.objects.create(
                    submission=submission,
                    blob_url=final_blob_url,
                    merchant_name=expense.merchant_name,
                    expense_date=expense.date,
                    category=expense.category,
                    activity=activity,
                    currency=expense.currency,
                    total_amount=expense.total_amount,
                    description=expense.description,
                    extra_details={
                        "tax_rate": expense.tax_rate,
                        "mileage": expense.mileage,
                        "start_location": expense.start_location,
                        "end_location": expense.end_location,
                        "attendees": expense.attendees
                    }
                )

        # --- STEP D: TRIGGER KANTATA SYNC (WITH 15 LIMIT) ---
        kantata_results = []
        sync_failed = False
        MAX_SYNC_BATCH = 15  

        print(f"Syncing Claim #{submission.id} to Kantata...")

        for group in payload.groups:
            all_expenses = group.expenses
            
            # Chunk the expenses for this group into batches of 15
            for i in range(0, len(all_expenses), MAX_SYNC_BATCH):
                chunk_expenses = all_expenses[i : i + MAX_SYNC_BATCH]
                
                # Create a temporary dictionary for the sync function
                # (sync_group_to_kantata handles dicts gracefully)
                chunk_group_data = {
                    "activity_name": group.activity_name,
                    "report_name": group.report_name,
                    "expenses": chunk_expenses
                }
                
                # Send this specific chunk
                print(f"   -> Sending batch {i // MAX_SYNC_BATCH + 1} for '{group.activity_name}' ({len(chunk_expenses)} items)")
                sync_result = sync_group_to_kantata(chunk_group_data)
                kantata_results.append(sync_result)
                
                # Check for failure
                if sync_result.get("status") == "failed":
                    sync_failed = True

        # --- STEP E: UPDATE DB STATUS ---
        if sync_failed:
            submission.status = 'FAILED'
        else:
            submission.status = 'SUCCESS'
        
        submission.save()

        # --- STEP F: RETURN COMBINED RESPONSE ---
        return {
            "status": "completed",
            "db_submission_id": submission.id,
            "db_status": submission.status,
            "message": "Claim saved to DB and processed for Sync",
            "kantata_sync_results": kantata_results
        }

    except Exception as e:
        print(f"CRITICAL ERROR in submit_claim: {e}")
        return {"status": "error", "message": str(e)}
 
@api.get("/analytics/kpis", response=KPISchema)
def get_analytics_kpis(request, range: str = "all"):
    """
    Returns aggregated KPIs filtered by the selected date range.
    Uses 'updated_at' to reflect when the claim was actually processed.
    """
    date_limit = get_date_limit(range)
    claims_qs = ClaimSubmission.objects.all()
    expenses_qs = ExpenseItem.objects.all()
    if date_limit:
        claims_qs = claims_qs.filter(updated_at__gte=date_limit)
        expenses_qs = expenses_qs.filter(submission__updated_at__gte=date_limit)
    total_claims = claims_qs.count()
    total_receipts = expenses_qs.count()
    total_amount = expenses_qs.aggregate(
        total=Coalesce(Sum('total_amount'), 0.0, output_field=DecimalField())
    )['total']
    pending = claims_qs.filter(status='PENDING').count()
    rejected = claims_qs.filter(status='REJECTED').count()
    return {
        "total_claims": total_claims,
        "total_receipts": total_receipts,
        "total_amount": round(float(total_amount or 0), 2),
        "pending_count": pending,
        "rejected_count": rejected
    }
 
@api.get("/analytics/graphs", response=List[GraphPoint])
def get_analytics_graphs(request, range: str = "day", metric: str = "amount"):
    """
    Returns time-series data for graphs, respecting the selected range.
    Uses 'submission__updated_at' for grouping data.
    """
    date_limit = get_date_limit(range)
    range_map = {
        "day": TruncDay,
        "week": TruncDay,
        "month": TruncDay,
        "quarter": TruncWeek,
        "all": TruncMonth
    }
    trunc_func = range_map.get(range, TruncDay)
   
    if metric == "users":
        qs = ClaimSubmission.objects.all()
        if date_limit:
            qs = qs.filter(updated_at__gte=date_limit)
           
        qs = qs.annotate(period=trunc_func('updated_at'))\
               .values('period')\
               .annotate(value=Count('user', distinct=True))
    else:
        qs = ExpenseItem.objects.all()
        if date_limit:
            qs = qs.filter(submission__updated_at__gte=date_limit)
           
        qs = qs.annotate(period=trunc_func('submission__updated_at'))\
               .values('period')
       
        if metric == "amount":
            qs = qs.annotate(value=Sum('total_amount'))
        else:
            qs = qs.annotate(value=Count('id'))
       
    qs = qs.order_by('period')
 
    data = []
    for entry in qs:
        if entry['period']:
            if range == "quarter":
                label = entry['period'].strftime("%Y W%V")
            elif range == "all":
                label = entry['period'].strftime("%Y-%m")
            else:
                label = entry['period'].strftime("%Y-%m-%d")
 
            data.append({
                "label": label,
                "value": round(float(entry['value'] or 0), 2)
            })
    return data
 
@api.get("/analytics/breakdown", response=List[CategoryStat])
def get_analytics_breakdown(request, type: str = "category", range: str = "all"):
    """
    Returns breakdown by Category, Activity, or Status (Pie Chart).
    Uses 'updated_at' for filtering.
    """
    date_limit = get_date_limit(range)
   
    if type == 'status':
        qs = ClaimSubmission.objects.all()
        if date_limit:
            qs = qs.filter(updated_at__gte=date_limit)
       
        qs = qs.values('status').annotate(total=Count('id'))
        return [{"name": item['status'], "value": item['total']} for item in qs]
 
    field_map = {"category": "category", "activity": "activity"}
    db_field = field_map.get(type, "category")
   
    qs = ExpenseItem.objects.all()
    if date_limit:
        qs = qs.filter(submission__updated_at__gte=date_limit)
 
    qs = qs.values(db_field).annotate(total=Sum('total_amount')).order_by('-total')[:8]
   
    results = []
    for item in qs:
        name = item[db_field] or "Unknown"
        clean_name = name if len(name) < 22 else name[:20] + "..."
        results.append({
            "name": clean_name,
            "value": round(float(item['total'] or 0), 2)
        })
       
    return results
 
@api.get("/analytics/top-users", response=List[dict])
def get_top_users(request, range: str = "all"):
    """
    Returns Top Users by number of submissions in the selected range.
    Uses 'updated_at' for filtering.
    """
    date_limit = get_date_limit(range)
   
    count_filter = Q()
    if date_limit:
        count_filter = Q(submissions__updated_at__gte=date_limit)
 
    users = User.objects.annotate(
        claims_count=Count('submissions', filter=count_filter)
    ).filter(claims_count__gt=0).order_by('-claims_count')[:10]
 
    return [
        {
            "username": u.username,
            "claims_count": u.claims_count,
            "date_joined": u.date_joined.strftime("%Y-%m-%d"),
            "last_login": u.last_login.strftime("%Y-%m-%d %H:%M") if u.last_login else "Never"
        }
        for u in users
    ]
 
@api.get("/analytics/top-categories-detailed", response=dict)
def get_top_categories_detailed(request, page: int = 1, range: str = "all"):
    """
    Returns paginated category stats for the Detailed Table.
    Uses 'updated_at' for filtering.
    """
    date_limit = get_date_limit(range)
    page_size = 10
   
    qs = ExpenseItem.objects.all()
    if date_limit:
        qs = qs.filter(submission__updated_at__gte=date_limit)
 
    qs = qs.values('category').annotate(
        total_amount=Sum('total_amount'),
        receipt_count=Count('id')
    ).order_by('-total_amount')
   
    paginator = Paginator(qs, page_size)
    current_page = paginator.get_page(page)
 
    return {
        "items": [
            {
                "category": item['category'] or "Uncategorized",
                "total_amount": round(float(item['total_amount'] or 0), 2),
                "receipt_count": item['receipt_count']
            }
            for item in current_page
        ],
        "total_pages": paginator.num_pages
    }
 
@api.get("/analytics")
def get_analytics(request, range: str = "month"):
    """
    using 'submission__updated_at' for trends and filtering.
    """
    user = request.user
    if not user.is_authenticated:
        db_user = User.objects.first()
        if not db_user:
            return {"error": "No users in database"}
        user = db_user
    date_limit = get_date_limit(range)
    expenses = ExpenseItem.objects.filter(submission__user=user)
    submissions = ClaimSubmission.objects.filter(user=user)
    if date_limit:
        expenses = expenses.filter(submission__updated_at__gte=date_limit)
        submissions = submissions.filter(updated_at__gte=date_limit)
    total_spent = expenses.aggregate(
        total=Coalesce(Sum('total_amount'), 0.0, output_field=DecimalField())
    )['total']
    trend_qs = expenses.annotate(
        period=TruncDay('submission__updated_at')
    ).values('period').annotate(
        value=Coalesce(Sum('total_amount'), 0.0, output_field=DecimalField())
    ).order_by('period')
    trend_data = [
    {
        "label": entry['period'].strftime("%Y-%m-%d"),
        "value": float(entry['value'])
    }
    for entry in trend_qs if entry['period']
    ]
    volume_qs = expenses.values('category').annotate(
        total=Coalesce(Sum('total_amount'), 0.0, output_field=DecimalField())
    ).order_by('-total')[:8]
    volume_data = [
        {
            "name": (item['category'] or "Uncategorized")[:20],
            "value": float(item['total'])
        }
        for item in volume_qs
    ]
    status_qs = submissions.values('status').annotate(
        total=Count('id')
    )
    status_data = [
        {
            "name": item['status'],
            "value": item['total']
        }
        for item in status_qs
    ]
 
    return {
        "stats": {
            "totalAmount": round(float(total_spent or 0), 2),
            "totalReceipts": expenses.count(),
            "failedReceipts": submissions.filter(status='FAILED').count()
        },
        "volumeData": volume_data,
        "statusData": status_data,
        "monthlyTrend": trend_data
    }
 
@api.get("/check-sync/{run_id}")
def check_sync_endpoint(request, run_id: str):
    """Frontend will call this repeatedly for a specific batch"""
    headers = get_kantata_headers()
    instance_url = headers.pop("Salesforce-Instance-Url", getattr(settings, 'KANTATA_INSTANCE_URL', ''))
    result = check_single_import_status(instance_url, headers, run_id)
    return result 

@api.get("/exchange-rates")
def get_exchange_rates(request):
    rates = get_active_exchange_rates()
    return rates