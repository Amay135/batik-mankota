import random

import pytest
from django.core.management import call_command
from django.core.management.base import CommandError
from django.db.models import Sum

from apps.inventory.exceptions import InsufficientStock
from apps.inventory.models import Stock, StockMovement
from apps.inventory.services import (
    add_stock,
    adjust,
    consume_direct,
    consume_reserved,
    release,
    reserve,
)


def test_rekonsiliasi_cocok_setelah_stok_awal(varian, capsys):
    add_stock(varian.pk, 10)

    call_command("rekonsiliasi_stok")

    assert "cocok" in capsys.readouterr().out


def test_rekonsiliasi_mendeteksi_selisih_buatan(varian, capsys):
    add_stock(varian.pk, 10)
    Stock.objects.filter(variant=varian).update(qty_on_hand=12)

    with pytest.raises(CommandError):
        call_command("rekonsiliasi_stok")

    keluaran = capsys.readouterr().out
    assert varian.sku in keluaran
    assert "selisih=2" in keluaran


def test_rekonsiliasi_cocok_setelah_operasi_acak(varian, admin_user):
    rng = random.Random(7)
    add_stock(varian.pk, 50)

    for i in range(30):
        aksi = rng.choice(["masuk", "keluar", "adjust", "reserve"])
        try:
            if aksi == "masuk":
                add_stock(varian.pk, rng.randint(1, 10))
            elif aksi == "keluar":
                consume_direct(
                    [(varian.pk, rng.randint(1, 5))],
                    ref_type="pos",
                    ref_id=f"TRX-{i}",
                )
            elif aksi == "adjust":
                adjust(
                    varian.pk,
                    rng.choice([-5, -3, -1, 1, 2, 4]),
                    actor=admin_user,
                    note=f"opname {i}",
                )
            else:
                order_ref = f"ORD-{i}"
                reserve([(varian.pk, rng.randint(1, 3))], order_ref=order_ref)
                if i % 2:
                    release(order_ref)
                else:
                    consume_reserved(order_ref)
        except InsufficientStock:
            pass

    total_ledger = StockMovement.objects.filter(variant=varian).aggregate(
        total=Sum("qty_delta")
    )["total"]
    assert total_ledger == Stock.objects.get(variant=varian).qty_on_hand
    call_command("rekonsiliasi_stok")
