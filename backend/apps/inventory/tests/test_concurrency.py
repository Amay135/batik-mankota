import threading
from concurrent.futures import ThreadPoolExecutor

import pytest
from django.db import close_old_connections, connection
from django.db.models import Sum

from apps.inventory.exceptions import InsufficientStock
from apps.inventory.models import Stock, StockMovement
from apps.inventory.services import add_stock, consume_direct

JUMLAH_PEMBELI = 50
STOK_AWAL = 10


@pytest.mark.django_db(transaction=True)
def test_50_pembeli_bereebutan_stok_10(varian):
    add_stock(varian.pk, STOK_AWAL)
    barrier = threading.Barrier(JUMLAH_PEMBELI)

    def beli(_):
        close_old_connections()
        try:
            barrier.wait(timeout=30)
            consume_direct([(varian.pk, 1)], ref_type="pos", ref_id="TRX-1")
            return True
        except InsufficientStock:
            return False
        finally:
            connection.close()

    with ThreadPoolExecutor(max_workers=JUMLAH_PEMBELI) as executor:
        hasil = list(executor.map(beli, range(JUMLAH_PEMBELI)))

    assert sum(hasil) == STOK_AWAL
    stok = Stock.objects.get(variant=varian)
    assert stok.qty_on_hand == 0
    assert stok.qty_reserved == 0
    assert (
        StockMovement.objects.filter(
            variant=varian, type=StockMovement.Type.POS_OUT
        ).count()
        == STOK_AWAL
    )
    total_ledger = StockMovement.objects.filter(variant=varian).aggregate(
        total=Sum("qty_delta")
    )["total"]
    assert total_ledger == 0


@pytest.mark.django_db(transaction=True)
def test_dua_thread_membeli_item_terakhir_hanya_satu_berhasil(varian):
    add_stock(varian.pk, 1)
    barrier = threading.Barrier(2)

    def beli(_):
        close_old_connections()
        try:
            barrier.wait(timeout=30)
            consume_direct([(varian.pk, 1)], ref_type="pos", ref_id="TRX-1")
            return True
        except InsufficientStock:
            return False
        finally:
            connection.close()

    with ThreadPoolExecutor(max_workers=2) as executor:
        hasil = list(executor.map(beli, range(2)))

    assert sum(hasil) == 1
    stok = Stock.objects.get(variant=varian)
    assert stok.qty_on_hand == 0
    assert stok.qty_on_hand >= 0
