import pytest
from django.db import connection
from django.db.migrations.executor import MigrationExecutor

SEBELUM_QR_TOKEN = [("catalog", "0002_motif")]
SESUDAH_QR_TOKEN = [("catalog", "0003_atribut_admin")]


@pytest.mark.django_db(transaction=True)
def test_semua_varian_lama_mendapat_qr_token_berbeda():
    executor = MigrationExecutor(connection)
    executor.migrate(SEBELUM_QR_TOKEN)
    try:
        apps_lama = executor.loader.project_state(SEBELUM_QR_TOKEN).apps
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
        for sku, ukuran in (("SKU-1", "L"), ("SKU-2", "M"), ("SKU-3", "S")):
            Varian.objects.create(
                produk=produk, warna="indigo", ukuran=ukuran, sku=sku, stok=1
            )

        executor = MigrationExecutor(connection)
        executor.migrate(SESUDAH_QR_TOKEN)
        apps_baru = executor.loader.project_state(SESUDAH_QR_TOKEN).apps
        VarianBaru = apps_baru.get_model("catalog", "Varian")
        token = list(
            VarianBaru.objects.filter(sku__startswith="SKU-").values_list(
                "qr_token", flat=True
            )
        )

        assert len(token) == 3
        assert all(token)
        assert len(set(token)) == 3
    finally:
        executor = MigrationExecutor(connection)
        executor.migrate(executor.loader.graph.leaf_nodes())
