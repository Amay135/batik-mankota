from decimal import Decimal
from uuid import uuid4

import pytest
from django.core.cache import cache
from django.db import IntegrityError, transaction
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts import totp
from apps.accounts.models import User
from apps.audit.models import AuditLog
from apps.catalog import services
from apps.catalog.models import (
    Kategori,
    Motif,
    PanduanUkuran,
    Produk,
    Ulasan,
    Varian,
)
from apps.orders.models import ItemPesanan, Pesanan

PASSWORD = "rahasia-kuat-1"
TABEL = [["Ukuran", "Lebar Dada"], ["M", "100"], ["L", "106"]]


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


def _verified(user):
    client = _masuk(user)
    response = client.post(
        "/api/v1/auth/2fa/verify/",
        {"code": totp.code_at(user.otp_secret)},
        format="json",
    )
    assert response.status_code == 200, response.content
    return client


@pytest.fixture
def admin(db):
    return User.objects.create_user(
        email="admin@mankota.test",
        password=PASSWORD,
        nama_lengkap="Admin",
        role=User.Role.ADMIN,
        otp_enabled=True,
        otp_secret=totp.generate_secret(),
    )


@pytest.fixture
def admin_client(admin):
    return _verified(admin)


@pytest.fixture
def kasir_client(db):
    kasir = User.objects.create_user(
        email="kasir@mankota.test",
        password=PASSWORD,
        nama_lengkap="Kasir",
        role=User.Role.KASIR,
    )
    return _masuk(kasir)


@pytest.fixture
def kategori(db):
    return Kategori.objects.create(
        nama="Batik Pria", slug="batik-pria", label_pendek="Pria"
    )


@pytest.fixture
def motif(db):
    return Motif.objects.create(nama="Parang", slug="parang")


@pytest.fixture
def produk(kategori, motif):
    return Produk.objects.create(
        nama="Kemeja Parang",
        slug="kemeja-parang",
        kategori=kategori,
        teknik="cap",
        motif=motif,
        bentuk="kemeja",
        warna_utama="indigo",
        harga=365_000,
    )


@pytest.fixture
def varian(produk):
    return Varian.objects.create(
        produk=produk,
        warna="indigo",
        ukuran="L",
        sku="KM-001-ID-L",
        harga_beli=200_000,
    )


def _pelanggan(email="pembeli@mankota.test", nama="Pembeli"):
    return User.objects.create_user(email=email, password=PASSWORD, nama_lengkap=nama)


def _pesanan(user, varian, *, status=Pesanan.Status.SELESAI):
    produk = varian.produk
    pesanan = Pesanan.objects.create(
        nomor=f"MK-{uuid4().hex[:10].upper()}",
        user=user,
        status=status,
        nama_lengkap=user.nama_lengkap,
        whatsapp="081234567890",
        email=user.email,
        alamat="Jl. Uji 1",
        provinsi="Jawa Tengah",
        kota="Surakarta",
        kecamatan="Laweyan",
        kode_pos="57148",
        subtotal=produk.harga,
        ongkir=0,
        total=produk.harga,
        metode_bayar=Pesanan.Metode.TRANSFER,
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
    return pesanan


def _url_ulasan(produk):
    return f"/api/v1/katalog/produk/{produk.slug}/ulasan/"


def test_tamu_tidak_menerima_ulasan_dan_panduan_ukuran(produk):
    PanduanUkuran.objects.create(kategori=produk.kategori, tabel=TABEL)
    Ulasan.objects.create(
        produk=produk, user=_pelanggan("ulasan@mankota.test", "Sari"), rating=5
    )

    body = APIClient().get(f"/api/v1/katalog/produk/{produk.slug}/").json()
    assert "ulasan" not in body
    assert "panduan_ukuran" not in body

    data = (
        _masuk(_pelanggan("lihat@mankota.test", "Budi"))
        .get(f"/api/v1/katalog/produk/{produk.slug}/")
        .json()
    )
    assert data["panduan_ukuran"] == TABEL
    assert [(u["nama"], u["rating"]) for u in data["ulasan"]] == [("Sari", 5)]


def test_admin_dan_kasir_tidak_bisa_menulis_ulasan(admin_client, kasir_client, produk):
    for client in (admin_client, kasir_client):
        response = client.post(_url_ulasan(produk), {"rating": 5}, format="json")
        assert response.status_code == 403


def test_hanya_pembeli_dengan_pesanan_selesai(produk, varian):
    user = _pelanggan()
    client = _masuk(user)

    response = client.post(_url_ulasan(produk), {"rating": 4}, format="json")
    assert response.status_code == 403
    assert response.json()["code"] == "BELUM_MEMBELI"

    _pesanan(user, varian, status=Pesanan.Status.DIKIRIM)
    assert (
        client.post(_url_ulasan(produk), {"rating": 4}, format="json").status_code
        == 403
    )

    _pesanan(user, varian, status=Pesanan.Status.SELESAI)
    response = client.post(
        _url_ulasan(produk), {"rating": 4, "teks": "  Nyaman  "}, format="json"
    )
    assert response.status_code == 201
    assert response.json()["teks"] == "Nyaman"


def test_satu_ulasan_per_user_dan_produk(produk, varian):
    user = _pelanggan()
    _pesanan(user, varian)
    client = _masuk(user)
    assert (
        client.post(_url_ulasan(produk), {"rating": 5}, format="json").status_code
        == 201
    )

    response = client.post(_url_ulasan(produk), {"rating": 3}, format="json")
    assert response.status_code == 400
    assert response.json()["code"] == "ULASAN_SUDAH_ADA"

    with pytest.raises(IntegrityError), transaction.atomic():
        Ulasan.objects.create(produk=produk, user=user, rating=1)


def test_rating_dan_panjang_teks_divalidasi(produk, varian):
    user = _pelanggan()
    _pesanan(user, varian)
    client = _masuk(user)
    url = _url_ulasan(produk)

    for rating in (0, 6):
        assert client.post(url, {"rating": rating}, format="json").status_code == 400
    assert (
        client.post(url, {"rating": 5, "teks": "a" * 1001}, format="json").status_code
        == 400
    )

    response = client.post(
        url, {"rating": 5, "teks": "<b>Bagus</b> sekali"}, format="json"
    )
    assert response.status_code == 201
    assert response.json()["teks"] == "Bagus sekali"


def test_pemilik_bisa_ubah_dan_hapus_ulasannya(produk, varian):
    owner = _pelanggan("pemilik@mankota.test")
    _pesanan(owner, varian)
    lain = _pelanggan("lain@mankota.test")

    ulasan = Ulasan.objects.create(produk=produk, user=owner, rating=5)
    services.perbarui_ringkasan_ulasan(produk)

    url = f"/api/v1/katalog/ulasan/{ulasan.pk}/"
    assert _masuk(lain).patch(url, {"rating": 1}, format="json").status_code == 404

    client = _masuk(owner)
    response = client.patch(url, {"rating": 2, "teks": "Kurang pas"}, format="json")
    assert response.status_code == 200
    assert response.json()["rating"] == 2
    produk.refresh_from_db()
    assert produk.rating == Decimal("2.0")

    assert client.delete(url).status_code == 204
    produk.refresh_from_db()
    assert produk.jumlah_ulasan == 0
    assert produk.rating == Decimal("0.0")


def test_ringkasan_rating_rata_rata_dan_jumlah(produk, admin_client):
    u1 = _pelanggan("satu@mankota.test", "Satu")
    u2 = _pelanggan("dua@mankota.test", "Dua")
    satu = Ulasan.objects.create(produk=produk, user=u1, rating=4)
    dua = Ulasan.objects.create(produk=produk, user=u2, rating=5)

    services.perbarui_ringkasan_ulasan(produk)
    produk.refresh_from_db()
    assert produk.rating == Decimal("4.5")
    assert produk.jumlah_ulasan == 2

    response = admin_client.patch(
        f"/api/v1/katalog/kelola/ulasan/{dua.pk}/", {"tampil": False}, format="json"
    )
    assert response.status_code == 200
    produk.refresh_from_db()
    assert produk.rating == Decimal("4.0")
    assert produk.jumlah_ulasan == 1

    body = _masuk(_pelanggan("lihat2@mankota.test"))
    data = body.get(f"/api/v1/katalog/produk/{produk.slug}/").json()
    assert [u["id"] for u in data["ulasan"]] == [satu.pk]


def test_moderasi_hanya_admin_2fa_dan_menulis_audit(admin, produk):
    ulasan = Ulasan.objects.create(
        produk=produk, user=_pelanggan("mod@mankota.test"), rating=5
    )
    url = f"/api/v1/katalog/kelola/ulasan/{ulasan.pk}/"

    assert _masuk(admin).patch(url, {"tampil": False}, format="json").status_code == 403
    assert APIClient().patch(url, {"tampil": False}, format="json").status_code == 401

    response = _verified(admin).patch(url, {"tampil": False}, format="json")
    assert response.status_code == 200

    log = AuditLog.objects.get(action=AuditLog.Action.REVIEW_MODERATE)
    assert log.actor == admin
    assert log.entity == "ulasan"
    assert log.entity_id == str(ulasan.pk)
    assert log.before == {"tampil": True}
    assert log.after == {"tampil": False}


def test_panduan_ukuran_dikelola_admin_dan_beraudit(admin, kategori):
    url = "/api/v1/katalog/kelola/panduan-ukuran/"

    assert (
        _masuk(admin)
        .post(url, {"kategori": kategori.pk, "tabel": TABEL}, format="json")
        .status_code
        == 403
    )

    client = _verified(admin)
    response = client.post(
        url, {"kategori": kategori.pk, "tabel": TABEL}, format="json"
    )
    assert response.status_code == 201
    panduan_id = response.json()["id"]
    detail = f"{url}{panduan_id}/"

    for invalid in (
        [["A", "B"], ["C"]],  # baris tidak sama panjang
        [["A", "B"], ["C", 4]],  # sel bukan teks
        [["A", "B"]],  # kurang dari 2 baris
    ):
        assert (
            client.post(
                url, {"kategori": kategori.pk, "tabel": invalid}, format="json"
            ).status_code
            == 400
        )

    tabel_baru = [["Ukuran", "Lebar Dada"], ["XL", "112"]]
    assert client.patch(detail, {"tabel": tabel_baru}, format="json").status_code == 200
    assert client.delete(detail).status_code == 204

    logs = list(
        AuditLog.objects.filter(action=AuditLog.Action.SIZE_GUIDE_CHANGE)
        .order_by("id")
        .values_list("before", "after")
    )
    assert logs == [
        ({}, {"tabel": TABEL}),
        ({"tabel": TABEL}, {"tabel": tabel_baru}),
        ({"tabel": tabel_baru}, {}),
    ]


def test_cache_katalog_naik_saat_ulasan_dan_panduan_berubah(produk, kategori):
    versi = services.versi_katalog()
    Ulasan.objects.create(
        produk=produk, user=_pelanggan("cache@mankota.test"), rating=3
    )
    assert services.versi_katalog() > versi

    versi = services.versi_katalog()
    PanduanUkuran.objects.create(kategori=kategori, tabel=TABEL)
    assert services.versi_katalog() > versi
