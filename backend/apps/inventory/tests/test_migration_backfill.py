import pytest
from django.db import connection
from django.db.migrations.executor import MigrationExecutor

SEBELUM = [("inventory", "0001_initial")]
SESUDAH = [("inventory", "0002_backfill_stock")]


@pytest.mark.django_db(transaction=True)
def test_migrasi_0002_mengisi_stok_dan_satu_entri_ledger():
    executor = MigrationExecutor(connection)
    executor.migrate(SEBELUM)
    try:
        apps_lama = executor.loader.project_state(SEBELUM).apps
        Kategori = apps_lama.get_model("catalog", "Kategori")
        Motif = apps_lama.get_model("catalog", "Motif")
        Produk = apps_lama.get_model("catalog", "Produk")
        Varian = apps_lama.get_model("catalog", "Varian")

        kategori = Kategori.objects.create(
            nama="Pria", slug="pria", label_pendek="Pria"
        )
        motif = Motif.objects.create(nama="Parang", slug="parang")
        produk = Produk.objects.create(
            nama="Kemeja",
            slug="kemeja",
            kategori=kategori,
            teknik="cap",
            motif=motif,
            bentuk="kemeja",
            warna_utama="indigo",
            harga=100_000,
        )
        berisi = Varian.objects.create(
            produk=produk, warna="indigo", ukuran="L", sku="SKU-N", stok=7
        )
        kosong = Varian.objects.create(
            produk=produk, warna="soga", ukuran="M", sku="SKU-0", stok=0
        )

        executor = MigrationExecutor(connection)
        executor.migrate(SESUDAH)
        apps_baru = executor.loader.project_state(SESUDAH).apps
        Stock = apps_baru.get_model("inventory", "Stock")
        StockMovement = apps_baru.get_model("inventory", "StockMovement")

        assert Stock.objects.get(variant_id=berisi.id).qty_on_hand == 7
        assert Stock.objects.get(variant_id=kosong.id).qty_on_hand == 0

        baris = list(
            StockMovement.objects.filter(variant_id=berisi.id).values_list(
                "type", "qty_delta", "ref_type"
            )
        )
        assert baris == [("ADJUST", 7, "migration")]
        assert not StockMovement.objects.filter(variant_id=kosong.id).exists()
    finally:
        executor = MigrationExecutor(connection)
        executor.migrate(executor.loader.graph.leaf_nodes())
