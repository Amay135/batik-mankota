from django.db import migrations


def pulihkan_stok(apps, schema_editor):
    """Rollback: isi kembali Varian.stok dari sumber tunggal inventory.Stock."""
    Varian = apps.get_model("catalog", "Varian")
    Stock = apps.get_model("inventory", "Stock")
    for stock in Stock.objects.iterator():
        Varian.objects.filter(pk=stock.variant_id).update(stok=stock.qty_on_hand)


class Migration(migrations.Migration):
    dependencies = [
        ("catalog", "0003_atribut_admin"),
        # Backfill inventory harus berjalan lebih dulu, termasuk di database baru.
        ("inventory", "0002_backfill_stock"),
    ]

    operations = [
        # Forward: data sudah disalin migration inventory.0002; Stock jadi sumber tunggal.
        migrations.RunPython(migrations.RunPython.noop, pulihkan_stok),
        migrations.RemoveField(model_name="varian", name="stok"),
    ]
