import pytest
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.catalog.models import Kategori, Motif, Produk, Varian
from apps.inventory.services import add_stock

PASSWORD = "rahasia-kuat-1"


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
        produk=produk, warna="indigo", ukuran="L", sku="KM-001-ID-L", harga_beli=200_000
    )


def _klien(user):
    client = APIClient()
    client.force_login(user)
    return client


@pytest.fixture
def kasir(db):
    user = User.objects.create_user(
        email="kasir@mankota.test",
        password=PASSWORD,
        nama_lengkap="Kasir",
        role=User.Role.KASIR,
    )
    return _klien(user)


@pytest.fixture
def user(db):
    user = User.objects.create_user(
        email="user@mankota.test",
        password=PASSWORD,
        nama_lengkap="Pelanggan",
    )
    return _klien(user)


@pytest.fixture
def admin_tanpa_2fa(db):
    user = User.objects.create_user(
        email="admin@mankota.test",
        password=PASSWORD,
        nama_lengkap="Admin",
        role=User.Role.ADMIN,
        otp_enabled=True,
    )
    return _klien(user)


def test_scan_qr_token(kasir, varian):
    add_stock(varian.pk, 7)

    response = kasir.get(f"/api/v1/kasir/varian/{varian.qr_token}/")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == varian.pk
    assert data["nama"] == varian.produk.nama
    assert data["sku"] == varian.sku
    assert data["ukuran"] == "L"
    assert data["warna"] == "Indigo"
    assert data["harga"] == varian.produk.harga
    assert data["stok"] == 7
    assert "harga_beli" not in data
    assert "cost_price" not in data


def test_scan_sku_mentah(kasir, varian):
    response = kasir.get(f"/api/v1/kasir/varian/{varian.sku}/")
    assert response.status_code == 200
    assert response.json()["id"] == varian.pk


def test_token_tak_dikenal_404(kasir):
    response = kasir.get("/api/v1/kasir/varian/tidak-ada/")
    assert response.status_code == 404
    assert response.json()["code"] == "VARIAN_TIDAK_DITEMUKAN"


def test_varian_nonaktif_404(kasir, varian):
    varian.aktif = False
    varian.save(update_fields=["aktif"])
    assert kasir.get(f"/api/v1/kasir/varian/{varian.qr_token}/").status_code == 404


def test_user_dan_tamu_ditolak(user, varian):
    assert user.get(f"/api/v1/kasir/varian/{varian.qr_token}/").status_code == 403
    assert (
        APIClient().get(f"/api/v1/kasir/varian/{varian.qr_token}/").status_code == 401
    )


def test_admin_tanpa_2fa_ditolak(admin_tanpa_2fa, varian):
    response = admin_tanpa_2fa.get(f"/api/v1/kasir/varian/{varian.qr_token}/")
    assert response.status_code == 403
