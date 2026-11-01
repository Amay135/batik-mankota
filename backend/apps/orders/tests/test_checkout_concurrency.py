import threading
from concurrent.futures import ThreadPoolExecutor

import pytest
from django.db import close_old_connections, connection
from rest_framework.exceptions import ValidationError

from apps.accounts.models import User
from apps.catalog.models import Kategori, Motif, Produk, Varian
from apps.inventory.models import Stock, StockMovement
from apps.inventory.services import add_stock
from apps.orders.models import ItemKeranjang, Pesanan
from apps.orders.services import buat_pesanan, keranjang_user

ALAMAT = {
    "nama_lengkap": "Rina Wulandari",
    "whatsapp": "0812 8690 1234",
    "email": "rina@email.com",
    "alamat": "Jl. Komang Raya No. 18",
    "provinsi": "DKI Jakarta",
    "kota": "Jakarta Selatan",
    "kecamatan": "Mampang Prapatan",
    "kode_pos": "12730",
    "metode_bayar": "transfer_bank",
    "bank": "bca",
}


@pytest.fixture(autouse=True)
def _wajib_postgresql():
    if connection.vendor != "postgresql":
        pytest.skip("Tes stok wajib PostgreSQL")


@pytest.fixture
def varian(db):
    kategori = Kategori.objects.create(
        nama="Batik Pria", slug="batik-pria", label_pendek="Pria"
    )
    motif = Motif.objects.create(nama="Parang", slug="parang")
    produk = Produk.objects.create(
        nama="Kemeja Parang Indigo",
        slug="kemeja-parang-indigo",
        kategori=kategori,
        teknik="cap",
        motif=motif,
        bentuk="kemeja",
        warna_utama="indigo",
        harga=365_000,
    )
    return Varian.objects.create(
        produk=produk, warna="indigo", ukuran="L", sku="KM-001-ID-L"
    )


@pytest.fixture
def pembeli(db):
    def _buat(i):
        return User.objects.create_user(
            email=f"pembeli{i}@mankota.test",
            password="rahasia-kuat-1",
            nama_lengkap=f"Pembeli {i}",
        )

    return _buat


def test_checkout_mencatat_ledger_online_out(varian, pembeli):
    add_stock(varian.pk, 5)
    user = pembeli(0)
    ItemKeranjang.objects.create(
        keranjang=keranjang_user(user), varian=varian, jumlah=2
    )

    pesanan = buat_pesanan(user, ALAMAT)

    assert Stock.objects.get(variant=varian).qty_on_hand == 3
    gerak = StockMovement.objects.get(
        variant=varian, type=StockMovement.Type.ONLINE_OUT
    )
    assert gerak.qty_delta == -2
    assert gerak.ref_id == pesanan.nomor


@pytest.mark.django_db(transaction=True)
def test_dua_checkout_item_terakhir_hanya_satu_berhasil(varian, pembeli):
    add_stock(varian.pk, 1)
    pengguna = [pembeli(i) for i in range(2)]
    for user in pengguna:
        ItemKeranjang.objects.create(
            keranjang=keranjang_user(user), varian=varian, jumlah=1
        )
    barrier = threading.Barrier(2)

    def beli(user):
        close_old_connections()
        try:
            barrier.wait(timeout=30)
            buat_pesanan(user, ALAMAT)
            return True
        except ValidationError:
            return False
        finally:
            connection.close()

    with ThreadPoolExecutor(max_workers=2) as executor:
        hasil = list(executor.map(beli, pengguna))

    assert sum(hasil) == 1
    assert Pesanan.objects.count() == 1
    assert Stock.objects.get(variant=varian).qty_on_hand == 0
    assert (
        StockMovement.objects.filter(
            variant=varian, type=StockMovement.Type.ONLINE_OUT
        ).count()
        == 1
    )
