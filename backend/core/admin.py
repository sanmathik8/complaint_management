from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User, UsernameHistory, LoginHistory, PasswordResetToken, UserSession

class CustomUserAdmin(UserAdmin):
    """Custom admin for User model"""
    list_display = ('username', 'is_verified', 'is_active', 'date_joined')
    list_filter = ('is_verified', 'is_active', 'is_staff', 'date_joined')
    search_fields = ('username', 'phone_number')
    ordering = ('-date_joined',)
    
    fieldsets = (
        (None, {'fields': ('username', 'password')}),
        ('Personal Info', {'fields': ('phone_number', 'profile_picture', 'bio')}),
        ('Permissions', {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
        ('Verification', {'fields': ('is_verified', 'verification_token', 'verification_sent_at')}),
        ('Status', {'fields': ('is_online', 'last_seen', 'last_login')}),
        ('Important dates', {'fields': ('date_joined', 'updated_at')}),
    )
    
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('username', 'password1', 'password2'),
        }),
    )
    
    readonly_fields = ('date_joined', 'updated_at', 'last_login', 'last_seen')


@admin.register(UsernameHistory)
class UsernameHistoryAdmin(admin.ModelAdmin):
    list_display = ('user', 'old_username', 'new_username', 'changed_at')
    list_filter = ('changed_at',)
    search_fields = ('user__username', 'old_username', 'new_username')
    readonly_fields = ('changed_at',)


@admin.register(LoginHistory)
class LoginHistoryAdmin(admin.ModelAdmin):
    list_display = ('email', 'user', 'success', 'ip_address', 'timestamp')
    list_filter = ('success', 'timestamp')
    search_fields = ('email', 'ip_address', 'failure_reason') # Kept email field name in LoginHistory as it stores the provided login ID
    readonly_fields = ('timestamp',)


@admin.register(PasswordResetToken)
class PasswordResetTokenAdmin(admin.ModelAdmin):
    list_display = ('user', 'created_at', 'expires_at', 'used_at', 'is_valid')
    list_filter = ('created_at', 'used_at')
    search_fields = ('user__username', 'token')
    readonly_fields = ('created_at', 'expires_at')


@admin.register(UserSession)
class UserSessionAdmin(admin.ModelAdmin):
    list_display = ('user', 'session_short', 'ip_address', 'created_at', 'last_activity', 'is_active')
    list_filter = ('created_at', 'expires_at')
    search_fields = ('user__username', 'session_key', 'ip_address')
    readonly_fields = ('created_at', 'last_activity')
    
    def session_short(self, obj):
        return obj.session_key[:20] + '...' if len(obj.session_key) > 20 else obj.session_key
    session_short.short_description = 'Session Key'
    
    def is_active(self, obj):
        return obj.expires_at > timezone.now()
    is_active.boolean = True


# Register User model with custom admin
admin.site.register(User, CustomUserAdmin)