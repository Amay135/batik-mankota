from datetime import timedelta

from django.conf import settings
from django.db import transaction
from django.utils import timezone

from apps.audit.models import AuditLog
from apps.audit.services import catat

from .exceptions import InsufficientStock, OpnameSudahDiterapkan
from .models import Stock, StockMovement, StockOpname, StockOpnameItem, StockReservation


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
    ref_type: str = "adjust",
    ref_id="",
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
        ref_type=ref_type,
        ref_id=ref_id,
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


@transaction.atomic
def ubah_min_stock(variant_id: int, min_stock: int, *, actor, note: str) -> Stock:
    """Ubah ambang stok minimum; qty tidak berubah sehingga tidak menulis ledger."""
    if not isinstance(min_stock, int) or min_stock < 0:
        raise ValueError("Stok minimum harus bilangan bulat tidak negatif.")
    if actor is None:
        raise ValueError("Actor wajib diisi untuk ubah stok minimum.")
    if not note.strip():
        raise ValueError("Alasan ubah stok minimum wajib diisi.")

    vid = int(variant_id)
    stock = _lock_stocks([vid])[vid]
    sebelum = stock.min_stock
    stock.min_stock = min_stock
    stock.version += 1
    stock.save(update_fields=["min_stock", "version"])
    catat(
        actor=actor,
        action=AuditLog.Action.MIN_STOCK_CHANGE,
        entity="stock",
        entity_id=vid,
        before={"min_stock": sebelum},
        after={"min_stock": min_stock},
    )
    return stock


@transaction.atomic
def buat_opname(items, *, actor, note: str) -> StockOpname:
    """Simpan sesi opname dengan snapshot qty_on_hand saat ini."""
    if actor is None:
        raise ValueError("Actor wajib diisi untuk opname.")
    if not note.strip():
        raise ValueError("Catatan opname wajib diisi.")

    daftar = [(int(variant_id), qty) for variant_id, qty in items]
    if not daftar:
        raise ValueError("Opname membutuhkan minimal satu varian.")
    for _, qty in daftar:
        if not isinstance(qty, int) or qty < 0:
            raise ValueError("Hitungan fisik harus bilangan bulat tidak negatif.")
    ids = [variant_id for variant_id, _ in daftar]
    if len(ids) != len(set(ids)):
        raise ValueError("Varian opname tidak boleh duplikat.")

    stocks = _lock_stocks(ids)
    opname = StockOpname.objects.create(note=note.strip(), actor=actor)
    StockOpnameItem.objects.bulk_create(
        [
            StockOpnameItem(
                opname=opname,
                variant_id=variant_id,
                system_qty=stocks[variant_id].qty_on_hand,
                counted_qty=qty,
            )
            for variant_id, qty in daftar
        ]
    )
    return opname


@transaction.atomic
def terapkan_opname(opname_id: int, *, actor) -> StockOpname:
    if actor is None:
        raise ValueError("Actor wajib diisi untuk opname.")

    opname = StockOpname.objects.select_for_update().get(pk=opname_id)
    if opname.status != StockOpname.Status.DRAFT:
        raise OpnameSudahDiterapkan()

    # Delta terhadap snapshot (bukan set ke hitungan) agar perubahan stok setelah
    # sesi dibuat, mis. penjualan, tetap dipertahankan secara aditif.
    for item in opname.items.order_by("variant_id"):
        delta = item.counted_qty - item.system_qty
        if delta == 0:
            continue
        adjust(
            item.variant_id,
            delta,
            actor=actor,
            note=f"Opname #{opname.pk}: {opname.note}"[:255],
            type=StockMovement.Type.OPNAME,
            ref_type="opname",
            ref_id=opname.pk,
        )

    opname.status = StockOpname.Status.APPLIED
    opname.applied_at = timezone.now()
    opname.save(update_fields=["status", "applied_at"])
    return opname
