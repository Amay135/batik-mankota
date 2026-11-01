import pytest
from django.db import DatabaseError, IntegrityError, connection, transaction

from apps.inventory.models import Stock, StockMovement


def _movement(varian, **extra):
    data = {"variant": varian, "type": StockMovement.Type.ADJUST, "qty_delta": 1}
    return StockMovement.objects.create(**{**data, **extra})


def test_database_yang_dipakai_adalah_postgresql(db):
    assert connection.vendor == "postgresql"


def test_signal_membuat_stock_saat_varian_baru(varian):
    assert Stock.objects.filter(variant=varian).count() == 1

    varian.save()  # update, bukan create; tidak boleh membuat Stock kedua

    assert Stock.objects.filter(variant=varian).count() == 1


def test_check_constraint_menolak_reserved_lebih_besar(varian):
    with pytest.raises(IntegrityError), transaction.atomic():
        Stock.objects.filter(variant=varian).update(qty_on_hand=1, qty_reserved=2)


def test_check_constraint_menolak_on_hand_negatif(varian):
    with pytest.raises(IntegrityError), transaction.atomic():
        Stock.objects.filter(variant=varian).update(qty_on_hand=-1)


def test_movement_tidak_bisa_diubah_atau_dihapus_lewat_orm(varian):
    movement = _movement(varian)

    movement.note = "ubah"
    with pytest.raises(ValueError):
        movement.save()

    with pytest.raises(ValueError):
        StockMovement.objects.filter(pk=movement.pk).update(note="ubah")

    with pytest.raises(ValueError):
        StockMovement.objects.filter(pk=movement.pk).delete()

    with pytest.raises(ValueError):
        movement.delete()

    with pytest.raises(ValueError):
        StockMovement.objects.bulk_update([movement], ["note"])

    assert StockMovement.objects.get(pk=movement.pk).note == ""


def test_movement_tidak_bisa_diubah_atau_dihapus_lewat_sql(varian):
    movement = _movement(varian)

    with pytest.raises(DatabaseError), transaction.atomic():
        with connection.cursor() as cursor:
            cursor.execute(
                "UPDATE inventory_stockmovement SET note = %s WHERE id = %s",
                ["ubah", movement.pk],
            )

    with pytest.raises(DatabaseError), transaction.atomic():
        with connection.cursor() as cursor:
            cursor.execute(
                "DELETE FROM inventory_stockmovement WHERE id = %s", [movement.pk]
            )

    assert StockMovement.objects.filter(pk=movement.pk).exists()
