from datetime import timedelta

from django.conf import settings
from django.db import transaction
from django.utils import timezone

from apps.audit.models import AuditLog
from apps.audit.services import catat

from .exceptions import InsufficientStock
from .models import Stock, StockMovement, StockReservation


def _validasi_qty(qty: int) -> None:
    if not isinstance(qty, int) or qty <= 0:
        raise ValueError("Jumlah harus bilangan bulat lebih dari 0.")


def _gabung_items(items) -> dict[int, int]:
    hasil: dict[int, int] = {}
    for variant_id, qty in items:
        _validasi_qty(qty)
        vid = int(variant_id)
        hasil[vid] = hasil.get(vid, 0) + qty
    return hasil


def _lock_stocks(variant_ids) -> dict[int, Stock]:
    ids = sorted(set(variant_ids))
    stocks = list(
        Stock.objects.select_for_update()
        .filter(variant_id__in=ids)
        .order_by("variant_id")
    )
    ditemukan = {stock.variant_id: stock for stock in stocks}
    hilang = [vid for vid in ids if vid not in ditemukan]
    if hilang:
        raise Stock.DoesNotExist(f"Stock tidak ditemukan untuk varian {hilang[0]}.")
    return ditemukan


@transaction.atomic
def reserve(
    items, *, order_ref: str, expires_at=None, actor=None
) -> list[StockReservation]:
    jumlah = _gabung_items(items)
    if not jumlah:
        return []

    stocks = _lock_stocks(jumlah)
    for variant_id, qty in jumlah.items():
        stock = stocks[variant_id]
        if stock.qty_on_hand - stock.qty_reserved < qty:
            raise InsufficientStock(variant_id)

    expires_at = expires_at or (
        timezone.now() + timedelta(minutes=settings.BATAS_RESERVASI_MENIT)
    )
    reservasi = []
    for variant_id in sorted(jumlah):
        qty = jumlah[variant_id]
        stock = stocks[variant_id]
        stock.qty_reserved += qty
        stock.version += 1
        stock.save(update_fields=["qty_reserved", "version"])
        reservasi.append(
            StockReservation.objects.create(
                variant_id=variant_id,
                order_ref=order_ref,
                qty=qty,
                expires_at=expires_at,
            )
        )
    return reservasi


@transaction.atomic
def release(order_ref: str) -> int:
    reservasi = list(
        StockReservation.objects.select_for_update()
        .filter(order_ref=order_ref, status=StockReservation.Status.ACTIVE)
        .order_by("variant_id", "id")
    )
    if not reservasi:
        return 0

    stocks = _lock_stocks({r.variant_id for r in reservasi})
    sekarang = timezone.now()
    for r in reservasi:
        stock = stocks[r.variant_id]
        stock.qty_reserved -= r.qty
        stock.version += 1
        stock.save(update_fields=["qty_reserved", "version"])
        r.status = (
            StockReservation.Status.EXPIRED
            if r.expires_at <= sekarang
            else StockReservation.Status.RELEASED
        )
        r.save(update_fields=["status"])
    return len(reservasi)


@transaction.atomic
def consume_reserved(
    order_ref: str, *, actor=None, ref_type: str = "order", ref_id=None
) -> list[StockMovement]:
    reservasi = list(
        StockReservation.objects.select_for_update()
        .filter(order_ref=order_ref, status=StockReservation.Status.ACTIVE)
        .order_by("variant_id", "id")
    )
    if not reservasi:
        return []

    stocks = _lock_stocks({r.variant_id for r in reservasi})
    movements = []
    for r in reservasi:
        stock = stocks[r.variant_id]
        if stock.qty_on_hand < r.qty or stock.qty_reserved < r.qty:
            raise InsufficientStock(r.variant_id)
        stock.qty_on_hand -= r.qty
        stock.qty_reserved -= r.qty
        stock.version += 1
        stock.save(update_fields=["qty_on_hand", "qty_reserved", "version"])
        r.status = StockReservation.Status.CONSUMED
        r.save(update_fields=["status"])
        movements.append(
            StockMovement.objects.create(
                variant_id=r.variant_id,
                type=StockMovement.Type.ONLINE_OUT,
                qty_delta=-r.qty,
                ref_type=ref_type,
                ref_id=ref_id if ref_id is not None else order_ref,
                actor=actor,
            )
        )
    return movements


@transaction.atomic
def consume_direct(
    items,
    *,
    ref_type: str,
    ref_id,
    actor=None,
    note: str = "",
    movement_type: str = StockMovement.Type.POS_OUT,
) -> list[StockMovement]:
    jumlah = _gabung_items(items)
    if not jumlah:
        return []

    stocks = _lock_stocks(jumlah)
    for variant_id, qty in jumlah.items():
        stock = stocks[variant_id]
        if stock.qty_on_hand - stock.qty_reserved < qty:
            raise InsufficientStock(variant_id)

    movements = []
    for variant_id in sorted(jumlah):
        qty = jumlah[variant_id]
        stock = stocks[variant_id]
        stock.qty_on_hand -= qty
        stock.version += 1
        stock.save(update_fields=["qty_on_hand", "version"])
        movements.append(
            StockMovement.objects.create(
                variant_id=variant_id,
                type=movement_type,
                qty_delta=-qty,
                ref_type=ref_type,
                ref_id=ref_id,
                actor=actor,
                note=note,
            )
        )
    return movements


@transaction.atomic
def add_stock(
    variant_id: int,
    qty: int,
    *,
    actor=None,
    ref_type: str = "",
    ref_id="",
    note: str = "",
) -> StockMovement:
    _validasi_qty(qty)
    vid = int(variant_id)
    stock = _lock_stocks([vid])[vid]
    stock.qty_on_hand += qty
    stock.version += 1
    stock.save(update_fields=["qty_on_hand", "version"])
    return StockMovement.objects.create(
        variant_id=vid,
        type=StockMovement.Type.PURCHASE_IN,
        qty_delta=qty,
        ref_type=ref_type,
        ref_id=ref_id,
        actor=actor,
        note=note,
    )


@transaction.atomic
def adjust(
    variant_id: int,
    qty_delta: int,
    *,
    actor,
    note: str = "",
    type=StockMovement.Type.ADJUST,
) -> StockMovement:
    if not isinstance(qty_delta, int) or qty_delta == 0:
        raise ValueError("Perubahan stok harus bilangan bulat dan tidak nol.")
    if type not in (StockMovement.Type.ADJUST, StockMovement.Type.OPNAME):
        raise ValueError("Tipe penyesuaian tidak valid.")
    if actor is None:
        raise ValueError("Actor wajib diisi untuk penyesuaian stok.")
    if not note.strip():
        raise ValueError("Alasan penyesuaian stok wajib diisi.")

    vid = int(variant_id)
    stock = _lock_stocks([vid])[vid]
    sebelum = stock.qty_on_hand
    sesudah = sebelum + qty_delta
    if sesudah < 0 or sesudah < stock.qty_reserved:
        raise InsufficientStock(vid)

    stock.qty_on_hand = sesudah
    stock.version += 1
    stock.save(update_fields=["qty_on_hand", "version"])
    movement = StockMovement.objects.create(
        variant_id=vid,
        type=type,
        qty_delta=qty_delta,
        ref_type="adjust",
        actor=actor,
        note=note,
    )
    catat(
        actor=actor,
        action=AuditLog.Action.STOCK_ADJUST,
        entity="stock",
        entity_id=vid,
        before={"qty_on_hand": sebelum},
        after={"qty_on_hand": sesudah},
    )
    return movement
