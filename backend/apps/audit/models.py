from django.conf import settings
from django.db import models


class AuditLog(models.Model):
    class Action(models.TextChoices):
        PRICE_CHANGE = "price_change", "Ubah harga"
        STOCK_ADJUST = "stock_adjust", "Penyesuaian stok"
        VOID_RETURN = "void_return", "Void/retur"
        ROLE_CHANGE = "role_change", "Ubah role"
        ADMIN_LOGIN = "admin_login", "Login admin"

    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="audit_log"
    )
    action = models.CharField(max_length=20, choices=Action.choices)
    entity = models.CharField(max_length=50, blank=True)
    entity_id = models.CharField(max_length=50, blank=True)
    before = models.JSONField(default=dict, blank=True)
    after = models.JSONField(default=dict, blank=True)
    ip = models.GenericIPAddressField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at", "-id"]

    def __str__(self):
        return f"{self.action} {self.entity}:{self.entity_id}"
