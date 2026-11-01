import pytest
from django.db import connection

from apps.accounts.models import User
from apps.catalog.models import Kategori, Motif, Produk, Varian


@pytest.fixture(autouse=True)
def _wajib_postgresql():
    # Stok dan konkurensi hanya diuji di PostgreSQL sesuai CLAUDE.md.
    if connection.vendor != "postgresql":
        pytest.skip("Tes inventory wajib PostgreSQL")


@pytest.fixture
def kategori(db):
    return Kategori.objects.create(
        nama="Batik Pria", slug="batik-pria", label_pendek="Pria"
    )


@pytest.fixture
def motif(db):
    return Motif.objects.create(nama="Parang", slug="parang")


@pytest.fixture
def produk(db, kategori, motif):
    return Produk.objects.create(
        nama="Kemeja Parang Indigo",
        slug="kemeja-parang-indigo",
        kategori=kategori,
        teknik="cap",
        motif=motif,
        bentuk="kemeja",
        warna_utama="indigo",
        harga=365_000,
    )


@pytest.fixture
def varian(db, produk):
    return Varian.objects.create(
        produk=produk, warna="indigo", ukuran="L", sku="KM-001-ID-L", harga_beli=200_000
    )


@pytest.fixture
def admin_user(db):
    return User.objects.create_user(
        email="admin@mankota.test", password="rahasia-kuat-1", role=User.Role.ADMIN
    )
