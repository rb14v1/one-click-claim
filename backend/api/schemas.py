# backend/api/schemas.py
from ninja import Schema
from typing import List, Optional
 
# --- 1. Constants & Mappings (Source of Truth) ---
 
ACTIVITIES = [
    'Conference', 'Delivery Operation Activities', 'Employee Engagement Events',
    'Employee Led Training', 'ESG Activities', 'Grant Related R&D', 'IMS Governance',
    'Onboarding', 'Org Dev Led Training', 'Partnership'
]
 
# Total List (Keep this for validation)
EXPENSE_CATEGORIES = [
    'Accommodation/Hotel', 'Australia - Mileage (KM) - electric vehicle',
    'Australia - Mileage (KM)- Petrol or diesel vehicle', 'Bank Charges',
    'Client Entertainment', 'Computer Peripherals',
    'Eye Test - Max Claim: €/£45 / INR 3000 / AUD $80 /USD $100',
    'Food: Breakfast or Lunch - Max Claim: €/£/$/AUD 15 / INR700',
    'Food: Dinner - Max Claim: €/£/$/AUD 45 / INR700',
    'Food: Per Diem - Max Claim: €/£/$/AUD 45 / INR 4000',
    'India - Mileage (KM) - electric vehicle - four wheeler',
    'India - Mileage (KM) - Petrol or diesel vehicle - four wheeler',
    'India - Mileage (KM) - Petrol or diesel vehicle - two wheeler',
    'India - Mileage (KM)- electric vehicle - two wheeler',
    'Memberships', 'Office Supplies', 'Other', 'Phone Bills/Broadband',
    'Prepaid Accommodation', 'Prepaid Car Rental & Fuel', 'Prepaid Flights',
    'Prepaid Luas/Bus/Train', 'Prepaid Other', 'Print & Postage',
    'ROI - Mileage (KM) - electric vehicle - Lower Mileage Rate',
    'ROI - Mileage (KM) - electric vehicle - Upper Mileage Rate',
    'ROI - Mileage (KM) - Petrol or diesel vehicle - Lower Mileage Rate',
    'ROI - Mileage (KM) - Petrol or diesel vehicle - Upper Mileage Rate',
    'Slovenia - Mileage (KM) - electric vehicle - Residential',
    'Slovenia - Mileage (KM) - Petrol or diesel vehicle - Non-Residential',
    'Slovenia - Mileage (KM) - Petrol or diesel vehicle - Residential',
    'Slovenia - Mileage (KM)- electric vehicle - Non-Residential',
    'Software', 'Spain - Mileage (KM) - electric vehicle',
    'Spain - Mileage (KM)- Petrol or diesel vehicle', 'Staff Engagement',
    'Stationery Consumables', 'Training', 'Transport: Car Rental & Fuel',
    'Transport: Flights', 'Transport: Luas/Bus/Train', 'Transport: Taxis/Cab/Uber',
    'Travel Other incl. Parking & Tolls', 'UK - Mileage (miles) - electric vehicle - Lower Mileage Rate',
    'UK - Mileage (miles) - electric vehicle - Upper Mileage Rate',
    'UK - Mileage (miles) - Petrol or diesel vehicle - Lower Mileage Rate',
    'UK - Mileage (miles) - Petrol or diesel vehicle - Upper Mileage Rate',
    'USA - Mileage (miles) - electric vehicle',
    'USA - Mileage (miles)- Petrol or diesel vehicle',
    'Visas, Sponsorship & Employment Permits'
]
 
# GROUP 1: Mileage (Needs: Mileage, Start Loc, End Loc)
CAT_GROUP_MILEAGE = [
    'Australia - Mileage (KM) - electric vehicle',
    'Australia - Mileage (KM)- Petrol or diesel vehicle',
    'India - Mileage (KM) - electric vehicle - four wheeler',
    'India - Mileage (KM) - Petrol or diesel vehicle - four wheeler',
    'India - Mileage (KM) - Petrol or diesel vehicle - two wheeler',
    'India - Mileage (KM)- electric vehicle - two wheeler',
    'ROI - Mileage (KM) - electric vehicle - Lower Mileage Rate',
    'ROI - Mileage (KM) - electric vehicle - Upper Mileage Rate',
    'ROI - Mileage (KM) - Petrol or diesel vehicle - Lower Mileage Rate',
    'ROI - Mileage (KM) - Petrol or diesel vehicle - Upper Mileage Rate',
    'Slovenia - Mileage (KM) - electric vehicle - Residential',
    'Slovenia - Mileage (KM) - Petrol or diesel vehicle - Non-Residential',
    'Slovenia - Mileage (KM) - Petrol or diesel vehicle - Residential',
    'Slovenia - Mileage (KM)- electric vehicle - Non-Residential',
    'Spain - Mileage (KM) - electric vehicle',
    'Spain - Mileage (KM)- Petrol or diesel vehicle',
    'UK - Mileage (miles) - electric vehicle - Lower Mileage Rate',
    'UK - Mileage (miles) - electric vehicle - Upper Mileage Rate',
    'UK - Mileage (miles) - Petrol or diesel vehicle - Lower Mileage Rate',
    'UK - Mileage (miles) - Petrol or diesel vehicle - Upper Mileage Rate',
    'USA - Mileage (miles) - electric vehicle',
    'USA - Mileage (miles)- Petrol or diesel vehicle'
]
 
# GROUP 2: Attendees (Needs: Amount, Tax, Attendees)
CAT_GROUP_ATTENDEES = [
    'Prepaid Accommodation',
    'Client Entertainment',
    'Staff Engagement'
]
 
# GROUP 3: Transport/Location (Needs: Amount, Tax, Start Loc, End Loc)
CAT_GROUP_TRANSPORT_LOC = [
    'Prepaid Flights',
    'Prepaid Luas/Bus/Train',
    'Transport: Flights',
    'Transport: Luas/Bus/Train',
    'Transport: Taxis/Cab/Uber'
]
 
# GROUP 4: Standard (Needs: Amount, Tax)
# Anything NOT in the lists above defaults to this.
# Explicit list for clarity:
CAT_GROUP_STANDARD = [
    'Accommodation/Hotel', 'Bank Charges', 'Computer Peripherals',
    'Eye Test - Max Claim: €/£45 / INR 3000 / AUD $80 /USD $100',
    'Food: Breakfast or Lunch - Max Claim: €/£/$/AUD 15 / INR700',
    'Food: Dinner - Max Claim: €/£/$/AUD 45 / INR700',
    'Food: Per Diem - Max Claim: €/£/$/AUD 45 / INR 4000',
    'Memberships', 'Office Supplies', 'Other', 'Phone Bills/Broadband',
    'Prepaid Car Rental & Fuel', 'Prepaid Other', 'Print & Postage',
    'Software', 'Stationery Consumables', 'Training', 'Transport: Car Rental & Fuel',
    'Travel Other incl. Parking & Tolls', 'Visas, Sponsorship & Employment Permits'
]
 
TAX_RATES = ['Zero Rate VAT', 'VAT', 'Exempt Tax']
CURRENCIES = ['USD', 'EUR', 'GBP', 'INR', 'AUD', 'CAD', 'CHF', 'SGD']
 
# --- SCHEMAS ---
 
# 1. Expense Item (Child)
class ExpenseItemSchema(Schema):
    blob_name: str 
    blob_url: Optional[str] = None
    report_name: str       
    date: Optional[str] = None      
    category: str                    
    currency: str                    
    description: Optional[str] = None
    merchant_name: str              
   
    # Conditional Fields
    total_amount: Optional[float] = None
    tax_rate: Optional[str] = None
    mileage: Optional[float] = None
    attendees: Optional[str] = None
    start_location: Optional[str] = None
    end_location: Optional[str] = None
   
    # Internal use for Bot
    receipt_blob: Optional[bytes] = None
 
# Schema for Rejected Files
class RejectedFileSchema(Schema):
    filename: str
    reason: str
     
# 2. Activity Group (Parent)
class ActivityGroupSchema(Schema):
    activity_name: str
    report_name: str
    total_activity_cost: Optional[float] = 0.0
    expenses: List[ExpenseItemSchema]
 
# 3. Response Schema (List of Groups)
class GroupedReceiptsResponse(Schema):
    groups: List[ActivityGroupSchema]
    rejected: List[RejectedFileSchema]
 
# 4. Submission Schema (Mirroring the Grouped Response)
class ClaimSubmissionSchema(Schema):
    groups: List[ActivityGroupSchema]
    
class KPISchema(Schema):
    total_claims: int
    total_receipts: int
    total_amount: float
    pending_count: int
    rejected_count: int
 
class GraphPoint(Schema):
    label: str
    value: float
 
class CategoryStat(Schema):
    name: str
    value: float
 
class UserStat(Schema):
    username: str
    claims_count: int
    date_joined: str
    last_login: Optional[str]
 
class DetailedCategoryStat(Schema):
    category: str
    total_amount: float
    receipt_count: int   

class PaginatedCategoryStatResponse(Schema):
    items: List[DetailedCategoryStat]
    total_pages: int     
 