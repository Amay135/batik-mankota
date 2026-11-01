from django.db import migrations


def isi_stok_awal(apps, schema_editor):
    Varian = apps.get_model("catalog", "Varian")
    Stock = apps.get_model("inventory", "Stock")
    StockMovement = apps.get_model("inventory", "StockMovement")

    for varian in Varian.objects.only("id", "stok").iterator():
        Stock.objects.create(
            variant_id=varian.id,
            qty_on_hand=varian.stok,
            qty_reserved=0,
            min_stock=5,
            version=0,
        )
        if varian.stok > 0:
            StockMovement.objects.create(
                variant_id=varian.id,
                type="ADJUST",
                qty_delta=varian.stok,
                ref_type="migration",
                note="Saldo awal inventory",
            )


class Migration(migrations.Migration):
    dependencies = [("inventory", "0001_initial")]

    operations = [
        # Rollback sengaja tidak menghapus ledger: StockMovement bersifat append-only.
        migrations.RunPython(isi_stok_awal, migrations.RunPython.noop),
    ]
