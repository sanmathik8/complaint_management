from django.contrib import admin
from .models import (
    ComplaintCategory, AnonymousSession, Complaint,
    ComplaintAction, ComplaintSettings
)

@admin.register(ComplaintCategory)
class ComplaintCategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'slug', 'default_severity', 'response_days']
    prepopulated_fields = {'slug': ('name',)}
    list_filter = ['requires_evidence']
    search_fields = ['name', 'description']


@admin.register(AnonymousSession)
class AnonymousSessionAdmin(admin.ModelAdmin):
    list_display = ['session_hash_short', 'member', 'created_at', 'expires_at', 'complaint_count']
    list_filter = ['is_active', 'created_at']
    search_fields = ['session_hash', 'member__username']
    readonly_fields = ['session_hash', 'original_hash', 'hashed_ip']
    
    def session_hash_short(self, obj):
        return obj.session_hash[:10] + '...'
    session_hash_short.short_description = 'Session Hash'




class ComplaintActionInline(admin.TabularInline):
    model = ComplaintAction
    extra = 0
    readonly_fields = ['action_type', 'member', 'created_at']
    can_delete = False


@admin.register(Complaint)
class ComplaintAdmin(admin.ModelAdmin):
    list_display = [
        'complaint_id', 'tracking_code', 'category', 'severity_display',
        'status', 'submission_date', 'response_deadline', 'is_read'
    ]
    list_filter = ['status', 'severity', 'category', 'submission_date']
    search_fields = ['complaint_id', 'tracking_code', 'encrypted_content']
    readonly_fields = [
        'complaint_id', 'tracking_code', 'session', 'submission_date',
        'created_at', 'updated_at'
    ]
    inlines = [ComplaintActionInline]
    actions = ['mark_as_reviewed', 'mark_as_resolved']
    
    def severity_display(self, obj):
        return obj.get_severity_display()
    severity_display.short_description = 'Severity'
    
    def mark_as_reviewed(self, request, queryset):
        queryset.update(status='reviewing')
    mark_as_reviewed.short_description = "Mark selected as reviewing"
    
    def mark_as_resolved(self, request, queryset):
        queryset.update(status='resolved')
    mark_as_resolved.short_description = "Mark selected as resolved"


@admin.register(ComplaintSettings)
class ComplaintSettingsAdmin(admin.ModelAdmin):
    list_display = ['cooldown_hours', 'max_complaints_per_day', 'auto_escalate_days']
    
    def has_add_permission(self, request):
        return False
    
    def has_delete_permission(self, request, obj=None):
        return False