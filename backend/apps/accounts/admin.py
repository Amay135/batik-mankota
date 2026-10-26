from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import User


@admin.register(User)
class AkunAdmin(UserAdmin):
    ordering = ("email",)
    list_display = ("email", "nama_lengkap", "whatsapp", "is_staff")
    search_fields = ("email", "nama_lengkap")
    fieldsets = (
        (None, {"fields": ("email", "password")}),
        ("Profil", {"fields": ("nama_lengkap", "whatsapp")}),
        ("Izin", {"fields": ("is_active", "is_staff", "is_superuser", "groups", "user_permissions")}),
    )
    add_fieldsets = ((None, {"classes": ("wide",), "fields": ("email", "password1", "password2")}),)
