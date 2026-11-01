from io import BytesIO

import pytest
from django.core.cache import cache
from django.core.files.storage import FileSystemStorage
from django.core.files.uploadedfile import SimpleUploadedFile
from django.utils import timezone
from PIL import Image
from rest_framework.test import APIClient

from apps.accounts import totp
from apps.accounts.admin_scope import ADMIN_CAPABILITIES
from apps.accounts.models import User
from apps.audit.models import AuditLog
from apps.catalog.models import FotoProduk, Kategori, Motif, Produk, Varian
from apps.orders.models import ItemKeranjang, ItemPesanan, Keranjang, Pesanan

PASSWORD = "rahasia-kuat-1"


@pytest.fixture(autouse=True)
def _bersihkan_cache():
    cache.clear()


def _masuk(user):
    client = APIClient()
    response = client.post(
        "/api/v1/auth/masuk/",
        {"email": user.email, "password": PASSWORD},
        format="json",
    )
    assert response.status_code == 200, response.content
    return client


@pytest.fixture
def admin(db):
    user = User.objects.create_user(
        email="admin@mankota.test",
        password=PASSWORD,
        nama_lengkap="Admin",
        role=User.Role.ADMIN,
        otp_enabled=True,
        otp_secret=totp.generate_secret(),
    )
    client = _masuk(user)
    response = client.post(
        "/api/v1/auth/2fa/verify/",
        {"code": totp.code_at(user.otp_secret)},
        format="json",
    )
    assert response.status_code == 200, response.content
    return client


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


def _png(width=4, height=4):
    buffer = BytesIO()
    Image.new("RGB", (width, height), "red").save(buffer, format="PNG")
    return buffer.getvalue()


def test_qr_token_tetap_saat_harga_dan_nama_diubah(admin, produk, varian):
    token = varian.qr_token
    assert token

    response = admin.patch(
        f"/api/v1/katalog/kelola/varian/{varian.pk}/",
        {"harga_beli": 250_000},
        format="json",
    )
    assert response.status_code == 200, response.content

    response = admin.patch(
        f"/api/v1/katalog/kelola/produk/{produk.pk}/",
        {"nama": "Kemeja Parang Baru", "harga": 400_000},
        format="json",
    )
    assert response.status_code == 200, response.content

    varian.refresh_from_db()
    assert varian.qr_token == token


KATALOG_ADMIN = [
    entry
    for entry in ADMIN_CAPABILITIES
    if entry["path"].startswith("/api/v1/katalog/kelola/")
]


def _call(client, entry):
    path = entry["path"].replace("<int:pk>", "1")
    return getattr(client, entry["method"].lower())(path, {}, format="json")


def test_kasir_user_dan_tamu_ditolak_di_semua_endpoint_kelola(db):
    assert KATALOG_ADMIN
    kasir = User.objects.create_user(
        email="kasir@mankota.test",
        password=PASSWORD,
        nama_lengkap="Kasir",
        role=User.Role.KASIR,
    )
    pelanggan = User.objects.create_user(
        email="user@mankota.test", password=PASSWORD, nama_lengkap="Pelanggan"
    )
    kasir_client, user_client = _masuk(kasir), _masuk(pelanggan)
    guest = APIClient()

    for entry in KATALOG_ADMIN:
        for client in (kasir_client, user_client):
            assert _call(client, entry).status_code == 403, entry
        assert _call(guest, entry).status_code == 401, entry


def test_unggah_bukan_gambar_ditolak(admin, produk):
    berkas = SimpleUploadedFile(
        "catatan.txt", b"bukan gambar", content_type="text/plain"
    )
    response = admin.post(
        f"/api/v1/katalog/kelola/produk/{produk.pk}/foto/",
        {"gambar": berkas},
        format="multipart",
    )
    assert response.status_code == 400
    assert "gambar" in response.json()


def test_unggah_gambar_diproses_dengan_nama_acak(admin, produk, tmp_path, monkeypatch):
    monkeypatch.setattr(
        FotoProduk._meta.get_field("gambar"),
        "storage",
        FileSystemStorage(location=tmp_path),
    )
    berkas = SimpleUploadedFile(
        "foto-asli.png", _png(2000, 100), content_type="image/png"
    )
    response = admin.post(
        f"/api/v1/katalog/kelola/produk/{produk.pk}/foto/",
        {"gambar": berkas, "alt": "Motif parang"},
        format="multipart",
    )
    assert response.status_code == 201, response.content

    foto = FotoProduk.objects.get(pk=response.json()["id"])
    assert foto.gambar.name.startswith("produk/")
    assert "foto-asli" not in foto.gambar.name
    assert foto.alt == "Motif parang"
    assert (tmp_path / foto.gambar.name).exists()
    # Dibuktikan bahwa Pillow memperkecil gambar, bukan menyimpan berkas asli.
    with Image.open(tmp_path / foto.gambar.name) as hasil:
        assert hasil.size == (1600, 80)


def test_perubahan_harga_produk_tercatat_di_audit(admin, produk):
    response = admin.patch(
        f"/api/v1/katalog/kelola/produk/{produk.pk}/", {"harga": 400_000}, format="json"
    )
    assert response.status_code == 200, response.content

    log = AuditLog.objects.get(
        action=AuditLog.Action.PRICE_CHANGE, entity="produk", entity_id=str(produk.pk)
    )
    assert log.before == {"harga": 365_000}
    assert log.after == {"harga": 400_000}
    assert log.actor.email == "admin@mankota.test"


def test_harga_beli_hanya_bocor_di_serializer_admin(admin, produk, varian):
    admin_body = admin.get(f"/api/v1/katalog/kelola/produk/{produk.pk}/").content
    assert b"harga_beli" in admin_body

    pelanggan = User.objects.create_user(
        email="pembeli@mankota.test", password=PASSWORD, nama_lengkap="Pembeli"
    )
    public_body = (
        _masuk(pelanggan).get(f"/api/v1/katalog/produk/{produk.slug}/").content
    )
    assert b"harga_beli" not in public_body


def test_harga_beli_tidak_bocor_ke_keranjang_dan_pesanan(produk, varian):
    pelanggan = User.objects.create_user(
        email="pembeli2@mankota.test", password=PASSWORD, nama_lengkap="Pembeli"
    )
    client = _masuk(pelanggan)

    keranjang = Keranjang.objects.create(user=pelanggan)
    ItemKeranjang.objects.create(keranjang=keranjang, varian=varian, jumlah=1)
    assert b"harga_beli" not in client.get("/api/v1/keranjang/").content

    pesanan = Pesanan.objects.create(
        nomor="MK-UJI-1",
        user=pelanggan,
        nama_lengkap="Pembeli",
        whatsapp="081234567890",
        email=pelanggan.email,
        alamat="Jl. Uji 1",
        provinsi="Jawa Tengah",
        kota="Surakarta",
        kecamatan="Laweyan",
        kode_pos="57148",
        subtotal=365_000,
        ongkir=0,
        total=365_000,
        metode_bayar=Pesanan.Metode.TRANSFER,
        bank="bca",
        batas_bayar=timezone.now(),
    )
    ItemPesanan.objects.create(
        pesanan=pesanan,
        varian=varian,
        nama=produk.nama,
        slug=produk.slug,
        motif=produk.motif.slug,
        bentuk=produk.bentuk,
        warna=varian.warna,
        ukuran=varian.ukuran,
        sku=varian.sku,
        harga=produk.harga,
        jumlah=1,
    )
    body = client.get(f"/api/v1/pesanan/{pesanan.nomor}/").content
    assert b"harga_beli" not in body


def test_sku_unik_dan_harga_negatif_ditolak(admin, produk, varian):
    response = admin.post(
        f"/api/v1/katalog/kelola/produk/{produk.pk}/varian/",
        {"warna": "soga", "ukuran": "M", "sku": varian.sku, "harga_beli": 1_000},
        format="json",
    )
    assert response.status_code == 400
    assert "sku" in response.json()

    response = admin.patch(
        f"/api/v1/katalog/kelola/produk/{produk.pk}/", {"harga": -1}, format="json"
    )
    assert response.status_code == 400


def test_hapus_produk_menonaktifkan(admin, produk):
    response = admin.delete(f"/api/v1/katalog/kelola/produk/{produk.pk}/")
    assert response.status_code == 204
    assert Produk.objects.filter(pk=produk.pk).exists()
    produk.refresh_from_db()
    assert produk.aktif is False

    pelanggan = User.objects.create_user(
        email="pembeli3@mankota.test", password=PASSWORD, nama_lengkap="Pembeli"
    )
    client = _masuk(pelanggan)
    assert client.get(f"/api/v1/katalog/produk/{produk.slug}/").status_code == 404
    slugs = [p["slug"] for p in client.get("/api/v1/katalog/produk/").json()["hasil"]]
    assert produk.slug not in slugs


def test_hapus_varian_menonaktifkan(admin, varian):
    response = admin.delete(f"/api/v1/katalog/kelola/varian/{varian.pk}/")
    assert response.status_code == 204
    assert Varian.objects.filter(pk=varian.pk).exists()
    varian.refresh_from_db()
    assert varian.aktif is False


def test_hapus_kategori_dan_motif_dipakai_ditolak(admin, produk):
    response = admin.delete(f"/api/v1/katalog/kelola/kategori/{produk.kategori_id}/")
    assert response.status_code == 409
    assert response.json()["code"] == "MASIH_DIPAKAI"

    response = admin.delete(f"/api/v1/katalog/kelola/motif/{produk.motif_id}/")
    assert response.status_code == 409

    assert Kategori.objects.filter(pk=produk.kategori_id).exists()
    assert Motif.objects.filter(pk=produk.motif_id).exists()
