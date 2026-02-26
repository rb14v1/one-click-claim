from django.db import models
from django.contrib.auth.models import User
 
# --- Table 2: Claim Submissions (Summary) ---
class ClaimSubmission(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="submissions")
    total_receipts_count = models.IntegerField(default=0)
    categories_breakdown = models.JSONField(default=dict, blank=True)
    total_amounts_by_currency = models.JSONField(default=dict, blank=True)
 
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('SUCCESS', 'Success'),
        ('FAILED', 'Failed'),
    ]
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
 
    def __str__(self):
        return f"Claim #{self.id} - {self.status}"
 
# --- Table 3: Expense Items (Detailed Receipts) ---
class ExpenseItem(models.Model):
    submission = models.ForeignKey(ClaimSubmission, related_name='expenses', on_delete=models.CASCADE)
    blob_url = models.URLField(max_length=1000)
    merchant_name = models.CharField(max_length=255, null=True, blank=True)
    expense_date = models.DateField(null=True, blank=True)
    category = models.CharField(max_length=255, null=True, blank=True)
    activity = models.CharField(max_length=255, null=True, blank=True)
    currency = models.CharField(max_length=10, null=True, blank=True)
    description = models.TextField(null=True, blank=True)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    extra_details = models.JSONField(default=dict, blank=True)
 
    def __str__(self):
        return f"{self.category} - {self.total_amount} {self.currency}"
 
 