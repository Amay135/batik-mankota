from django.conf import settings
from django.db import models
from django.db.models import F, Q


class Stock(models.Model):
    variant = models.OneToOneField(
        "catalog.Varian",
        on_delete=models.CASCADE,
        primary_key=True,
        related_name="stock",
    )
    qty_on_hand = models.PositiveIntegerField(default=0)
    qty_reserved = models.PositiveIntegerField(default=0)
    min_stock = models.PositiveIntegerField(default=5)
    version = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["variant_id"]
        verbose_name_plural = "stok"
        constraints = [
            models.CheckConstraint(
                condition=Q(qty_on_hand__gte=0), name="stock_on_hand_gte_0"
            ),
            models.CheckConstraint(
                condition=Q(qty_reserved__gte=0), name="stock_reserved_gte_0"
            ),
            models.CheckConstraint(
                condition=Q(qty_reserved__lte=F("qty_on_hand")),
                name="stock_reserved_lte_on_hand",
            ),
        ]

    def __str__(self):
        return self.variant.sku


class StockMovementQuerySet(models.QuerySet):
    def update(self, **kwargs):
        raise ValueError("StockMovement bersifat append-only; update tidak diizinkan.")

    def delete(self):
        raise ValueError("StockMovement bersifat append-only; hapus tidak diizinkan.")

    def bulk_update(self, objs, fields, batch_size=None):
        raise ValueError("StockMovement bersifat append-only; update tidak diizinkan.")


class StockMovement(models.Model):
    class Type(models.TextChoices):
        PURCHASE_IN = "PURCHASE_IN", "Pembelian masuk"
        POS_OUT = "POS_OUT", "Penjualan kasir"
        ONLINE_OUT = "ONLINE_OUT", "Penjualan online"
        RETURN_IN = "RETURN_IN", "Retur masuk"
        ADJUST = "ADJUST", "Penyesuaian"
        OPNAME = "OPNAME", "Stok opname"

    variant = models.ForeignKey(
        "catalog.Varian", on_delete=models.PROTECT, related_name="stock_movements"
    )
    type = models.CharField(max_length=12, choices=Type.choices)
    qty_delta = models.IntegerField()
    ref_type = models.CharField(max_length=50, blank=True)
    ref_id = models.CharField(max_length=64, blank=True)
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.PROTECT,
        related_name="stock_movements",
    )
    note = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    objects = StockMovementQuerySet.as_manager()

    class Meta:
        ordering = ["created_at", "id"]

    def save(self, *args, **kwargs):
        if not self._state.adding:
            raise ValueError(
                "StockMovement bersifat append-only; update tidak diizinkan."
            )
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise ValueError("StockMovement bersifat append-only; hapus tidak diizinkan.")

    def __str__(self):
        return f"{self.get_type_display()} {self.qty_delta:+d} {self.variant.sku}"


class StockReservation(models.Model):
    class Status(models.TextChoices):
        ACTIVE = "ACTIVE", "Aktif"
        CONSUMED = "CONSUMED", "Dikonsumsi"
        RELEASED = "RELEASED", "Dilepas"
        EXPIRED = "EXPIRED", "Kedaluwarsa"

    variant = models.ForeignKey(
        "catalog.Varian", on_delete=models.PROTECT, related_name="stock_reservations"
    )
    order_ref = models.CharField(max_length=64, db_index=True)
    qty = models.PositiveIntegerField()
    expires_at = models.DateTimeField(db_index=True)
    status = models.CharField(
        max_length=10, choices=Status.choices, default=Status.ACTIVE
    )

    class Meta:
        ordering = ["expires_at", "id"]

    def __str__(self):
        return f"{self.order_ref} {self.variant.sku} x{self.qty}"
