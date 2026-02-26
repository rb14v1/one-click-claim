# backend/api/admin.py
from django.contrib import admin
from .models import ClaimSubmission, ExpenseItem
 
class ExpenseItemInline(admin.TabularInline):
    model = ExpenseItem
    extra = 0
 
@admin.register(ClaimSubmission)
class ClaimSubmissionAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'status', 'total_receipts_count', 'created_at')
    list_filter = ('status', 'created_at')
    inlines = [ExpenseItemInline] 
 
 