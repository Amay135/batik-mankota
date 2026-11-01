from datetime import timedelta

import pytest
from django.utils import timezone

from apps.audit.models import AuditLog
from apps.inventory import services
from apps.inventory.exceptions import InsufficientStock
from apps.inventory.models import Stock, StockMovement, StockReservation


def _stok(varian):
    return Stock.objects.get(variant=varian)


def test_add_stock_mencatat_movement_dan_menaikkan_version(varian):
    movement = services.add_stock(
        varian.pk, 10, ref_type="test", ref_id="1", note="awal"
    )

    stock = _stok(varian)
    assert stock.qty_on_hand == 10
    assert stock.qty_reserved == 0
    assert stock.version == 1
    assert movement.type == StockMovement.Type.PURCHASE_IN
    assert movement.qty_delta == 10
    assert StockMovement.objects.filter(variant=varian).count() == 1


def test_add_stock_menolak_qty_nol_atau_negatif(varian):
    for qty in (0, -1):
        with pytest.raises(ValueError):
            services.add_stock(varian.pk, qty)


def test_reserve_mengunci_stok_tanpa_movement(varian):
    services.add_stock(varian.pk, 10)

    reservasi = services.reserve([(varian.pk, 4)], order_ref="ORD-1")

    assert len(reservasi) == 1
    assert reservasi[0].status == StockReservation.Status.ACTIVE
    assert reservasi[0].qty == 4
    assert _stok(varian).qty_reserved == 4
    assert _stok(varian).qty_on_hand == 10
    assert StockMovement.objects.filter(variant=varian).count() == 1
    assert reservasi[0].expires_at > timezone.now() + timedelta(minutes=50)


def test_reserve_menggabungkan_item_duplikat(varian):
    services.add_stock(varian.pk, 10)

    reservasi = services.reserve([(varian.pk, 2), (varian.pk, 3)], order_ref="ORD-1")

    assert len(reservasi) == 1
    assert reservasi[0].qty == 5
    assert _stok(varian).qty_reserved == 5


def test_reserve_gagal_tanpa_angka_stok(varian):
    services.add_stock(varian.pk, 3)

    with pytest.raises(InsufficientStock) as galat:
        services.reserve([(varian.pk, 4)], order_ref="ORD-1")

    assert str(galat.value) == "Stok tidak mencukupi."
    assert _stok(varian).qty_reserved == 0
    assert not StockReservation.objects.filter(order_ref="ORD-1").exists()


def test_reserve_menolak_qty_tidak_valid(varian):
    services.add_stock(varian.pk, 10)
    with pytest.raises(ValueError):
        services.reserve([(varian.pk, 0)], order_ref="ORD-1")


def test_release_mengembalikan_reservasi_aktif(varian):
    services.add_stock(varian.pk, 10)
    services.reserve([(varian.pk, 4)], order_ref="ORD-1")

    jumlah = services.release("ORD-1")

    assert jumlah == 1
    assert _stok(varian).qty_reserved == 0
    assert (
        StockReservation.objects.get(order_ref="ORD-1").status
        == StockReservation.Status.RELEASED
    )


def test_release_menandai_reservasi_kedaluwarsa(varian):
    services.add_stock(varian.pk, 10)
    services.reserve(
        [(varian.pk, 4)],
        order_ref="ORD-1",
        expires_at=timezone.now() - timedelta(minutes=1),
    )

    services.release("ORD-1")

    assert (
        StockReservation.objects.get(order_ref="ORD-1").status
        == StockReservation.Status.EXPIRED
    )
    assert _stok(varian).qty_reserved == 0


def test_release_tanpa_reservasi_aktif_tidak_berbuat_apa_apa(varian):
    assert services.release("TIDAK-ADA") == 0
    assert _stok(varian).qty_reserved == 0


def test_release_dua_kali_tidak_mengembalikan_stok_dua_kali(varian):
    services.add_stock(varian.pk, 10)
    services.reserve([(varian.pk, 4)], order_ref="ORD-1")

    assert services.release("ORD-1") == 1
    assert services.release("ORD-1") == 0

    assert _stok(varian).qty_reserved == 0
    assert (
        StockReservation.objects.get(order_ref="ORD-1").status
        == StockReservation.Status.RELEASED
    )


def test_consume_reserved_mengurangi_on_hand_dan_reserved(varian):
    services.add_stock(varian.pk, 10)
    services.reserve([(varian.pk, 4)], order_ref="ORD-1")

    movements = services.consume_reserved("ORD-1", ref_id="ORD-1")

    stock = _stok(varian)
    assert stock.qty_on_hand == 6
    assert stock.qty_reserved == 0
    assert len(movements) == 1
    assert movements[0].type == StockMovement.Type.ONLINE_OUT
    assert movements[0].qty_delta == -4
    assert (
        StockReservation.objects.get(order_ref="ORD-1").status
        == StockReservation.Status.CONSUMED
    )


def test_consume_reserved_idempoten_bila_tidak_ada_reservasi_aktif(varian):
    services.add_stock(varian.pk, 10)
    services.reserve([(varian.pk, 4)], order_ref="ORD-1")
    services.consume_reserved("ORD-1")

    assert services.consume_reserved("ORD-1") == []
    assert _stok(varian).qty_on_hand == 6


def test_consume_reserved_gagal_bila_stok_tidak_cukup(varian):
    services.add_stock(varian.pk, 10)
    services.reserve([(varian.pk, 4)], order_ref="ORD-1")
    # State rusak yang lolos CHECK: reservasi tercatat 4 tapi counter 0.
    Stock.objects.filter(variant=varian).update(qty_reserved=0)

    with pytest.raises(InsufficientStock):
        services.consume_reserved("ORD-1")

    stock = _stok(varian)
    assert stock.qty_on_hand == 10
    assert stock.qty_reserved == 0
    assert (
        StockReservation.objects.get(order_ref="ORD-1").status
        == StockReservation.Status.ACTIVE
    )


def test_consume_direct_menghormati_stok_terpesan(varian):
    services.add_stock(varian.pk, 10)
    services.reserve([(varian.pk, 4)], order_ref="ORD-1")

    with pytest.raises(InsufficientStock):
        services.consume_direct([(varian.pk, 7)], ref_type="pos", ref_id="TRX-1")
    assert _stok(varian).qty_on_hand == 10

    movements = services.consume_direct(
        [(varian.pk, 6)], ref_type="pos", ref_id="TRX-1", note="kasir"
    )

    stock = _stok(varian)
    assert stock.qty_on_hand == 4
    assert stock.qty_reserved == 4
    assert movements[0].type == StockMovement.Type.POS_OUT
    assert movements[0].qty_delta == -6
    assert movements[0].ref_type == "pos"
    assert movements[0].ref_id == "TRX-1"


def test_adjust_positif_dan_negatif_menulis_audit(varian, admin_user):
    services.add_stock(varian.pk, 10, actor=admin_user)

    services.adjust(varian.pk, 5, actor=admin_user, note="tambah")
    assert _stok(varian).qty_on_hand == 15

    movement = services.adjust(varian.pk, -3, actor=admin_user, note="rusak")
    stock = _stok(varian)
    assert stock.qty_on_hand == 12
    assert movement.type == StockMovement.Type.ADJUST
    assert movement.qty_delta == -3

    logs = list(
        AuditLog.objects.filter(action=AuditLog.Action.STOCK_ADJUST).order_by("id")
    )
    assert len(logs) == 2
    assert logs[0].actor == admin_user
    assert logs[0].before == {"qty_on_hand": 10}
    assert logs[0].after == {"qty_on_hand": 15}
    assert logs[1].before == {"qty_on_hand": 15}
    assert logs[1].after == {"qty_on_hand": 12}


def test_adjust_tidak_boleh_di_bawah_reserved(varian, admin_user):
    services.add_stock(varian.pk, 10)
    services.reserve([(varian.pk, 4)], order_ref="ORD-1")

    with pytest.raises(InsufficientStock):
        services.adjust(varian.pk, -7, actor=admin_user, note="uji")

    assert _stok(varian).qty_on_hand == 10


def test_adjust_tidak_boleh_negatif(varian, admin_user):
    services.add_stock(varian.pk, 2)

    with pytest.raises(InsufficientStock):
        services.adjust(varian.pk, -3, actor=admin_user, note="uji")


def test_adjust_wajib_alasan(varian, admin_user):
    services.add_stock(varian.pk, 10)

    for note in ("", "   "):
        with pytest.raises(ValueError):
            services.adjust(varian.pk, 1, actor=admin_user, note=note)

    assert _stok(varian).qty_on_hand == 10
    assert not StockMovement.objects.filter(type=StockMovement.Type.ADJUST).exists()
    assert not AuditLog.objects.exists()


def test_adjust_validasi_masukan(varian, admin_user):
    with pytest.raises(ValueError):
        services.adjust(varian.pk, 0, actor=admin_user)
    with pytest.raises(ValueError):
        services.adjust(varian.pk, 1, actor=None)
    with pytest.raises(ValueError):
        services.adjust(varian.pk, 1, actor=admin_user, type=StockMovement.Type.POS_OUT)


def test_galat_insufficient_stock_tidak_memuat_angka_stok(varian, admin_user):
    services.add_stock(varian.pk, 5)

    with pytest.raises(InsufficientStock) as gagal_reserve:
        services.reserve([(varian.pk, 999)], order_ref="ORD-1")
    with pytest.raises(InsufficientStock) as gagal_direct:
        services.consume_direct([(varian.pk, 999)], ref_type="pos", ref_id="TRX-1")
    with pytest.raises(InsufficientStock) as gagal_adjust:
        services.adjust(varian.pk, -999, actor=admin_user, note="uji")

    for galat in (gagal_reserve, gagal_direct, gagal_adjust):
        pesan = str(galat.value)
        assert pesan == "Stok tidak mencukupi."
        assert "999" not in pesan
        assert "5" not in pesan
