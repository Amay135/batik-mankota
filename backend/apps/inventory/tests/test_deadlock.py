import threading
from concurrent.futures import ThreadPoolExecutor

import pytest
from django.db import close_old_connections, connection

from apps.catalog.models import Varian
from apps.inventory.models import Stock, StockReservation
from apps.inventory.services import add_stock, release, reserve

ROUNDS = 10


@pytest.mark.django_db(transaction=True)
def test_reserve_dua_varian_urutan_terbalik_tanpa_deadlock(varian):
    varian_b = Varian.objects.create(
        produk=varian.produk, warna="soga", ukuran="M", sku="KM-001-SG-M"
    )
    add_stock(varian.pk, 100)
    add_stock(varian_b.pk, 100)

    def pesan(items, order_ref, barrier):
        close_old_connections()
        try:
            barrier.wait(timeout=30)
            reserve(items, order_ref=order_ref)
            return True
        finally:
            connection.close()

    for i in range(ROUNDS):
        barrier = threading.Barrier(2)
        with ThreadPoolExecutor(max_workers=2) as executor:
            futures = [
                executor.submit(
                    pesan, [(varian.pk, 1), (varian_b.pk, 1)], f"AB-{i}", barrier
                ),
                executor.submit(
                    pesan, [(varian_b.pk, 1), (varian.pk, 1)], f"BA-{i}", barrier
                ),
            ]
            assert all(f.result(timeout=30) for f in futures)

        assert release(f"AB-{i}") == 2
        assert release(f"BA-{i}") == 2

    assert not StockReservation.objects.filter(
        status=StockReservation.Status.ACTIVE
    ).exists()
    assert Stock.objects.get(variant=varian).qty_reserved == 0
    assert Stock.objects.get(variant=varian_b).qty_reserved == 0
