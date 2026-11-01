import pytest

from apps.inventory.models import Stock
from apps.inventory.selectors import available_qty, stock_status


@pytest.fixture
def stok(varian):
    return Stock.objects.get(variant=varian)


@pytest.mark.parametrize(
    ("on_hand", "reserved", "label"),
    [
        (0, 0, "Habis"),
        (1, 0, "Tinggal sedikit"),
        (5, 0, "Tinggal sedikit"),
        (6, 0, "Tersedia"),
        (10, 4, "Tersedia"),
        (5, 5, "Habis"),
    ],
)
def test_label_status_stok(stok, on_hand, reserved, label):
    Stock.objects.filter(pk=stok.pk).update(qty_on_hand=on_hand, qty_reserved=reserved)
    stok.refresh_from_db()

    assert available_qty(stok) == on_hand - reserved
    assert stock_status(stok) == label


def test_min_stock_tidak_mengubah_label(stok):
    Stock.objects.filter(pk=stok.pk).update(qty_on_hand=3, min_stock=1)
    stok.refresh_from_db()

    assert stock_status(stok) == "Tinggal sedikit"
