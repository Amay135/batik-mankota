import time

import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.accounts.permissions import ADMIN_2FA_AT_SESSION_KEY, ADMIN_2FA_SESSION_KEY
from apps.catalog.models import Kategori, Motif, Produk, Varian
from apps.crm import services
from apps.crm.models import Pelanggan
from apps.inventory.services import add_stock
from apps.orders.models import ItemKeranjang, ItemPesanan, Pesanan
from apps.orders.services import buat_pesanan, keranjang_user

PASSWORD = "rahasia-kuat-1"


@pytest.fixture
def admin(db):
    return User.objects.create_user(
        email="admin@mankota.test",
        password=PASSWORD,
        nama_lengkap="Admin",
        role=User.Role.ADMIN,
        otp_enabled=True,
    )


@pytest.fixture
def kasir(db):
    return User.objects.create_user(
        email="kasir@mankota.test",
        password=PASSWORD,
        nama_lengkap="Kasir",
        role=User.Role.KASIR,
    )


@pytest.fixture
def user(db):
    return User.objects.create_user(
        email="user@mankota.test",
        password=PASSWORD,
        nama_lengkap="Pelanggan Online",
    )


def _client_2fa(user):
    client = APIClient()
    client.force_login(user)
    session = client.session
    session[ADMIN_2FA_SESSION_KEY] = user.pk
    session[ADMIN_2FA_AT_SESSION_KEY] = int(time.time())
    session.save()
    return client


@pytest.fixture
def admin_client(admin):
    return _client_2fa(admin)


@pytest.fixture
def kasir_client(kasir):
    client = APIClient()
    client.force_login(kasir)
    return client


@pytest.fixture
def user_client(user):
    client = APIClient()
    client.force_login(user)
    return client


@pytest.fixture
def pelanggan(db):
    return Pelanggan.objects.create(
        nama="Rina Wulandari",
        telepon="081286901234",
        email="rina@example.com",
        alamat="Jl. Komang Raya No. 18",
    )


def _pesanan(
    user, pelanggan=None, *, nomor, status=Pesanan.Status.SELESAI, total=100_000
):
    return Pesanan.objects.create(
        nomor=nomor,
        user=user,
        pelanggan=pelanggan,
        status=status,
        nama_lengkap="Rina Wulandari",
        whatsapp="081286901234",
        email="rina@example.com",
        alamat="Jl. Komang Raya No. 18",
        provinsi="DKI Jakarta",
        kota="Jakarta Selatan",
        kecamatan="Mampang Prapatan",
        kode_pos="12730",
        subtotal=total,
        ongkir=0,
        total=total,
        metode_bayar=Pesanan.Metode.TRANSFER,
        bank="bca",
        batas_bayar=timezone.now(),
    )


def test_buat_pelanggan_menormalkan_telepon(admin_client):
    response = admin_client.post(
        "/api/v1/pelanggan/",
        {
            "nama": "  Siti Aminah ",
            "telepon": "+62 812-3456-7890",
            "email": " Siti@Example.com ",
            "alamat": "Jl. Malioboro 1",
            "catatan": "Suka motif parang",
        },
        format="json",
    )
    assert response.status_code == 201, response.content
    data = response.json()
    assert data["nama"] == "Siti Aminah"
    assert data["telepon"] == "081234567890"
    assert data["email"] == "siti@example.com"
    assert data["jumlah_transaksi"] == 0
    assert Pelanggan.objects.get(pk=data["id"]).catatan == "Suka motif parang"


def test_nama_wajib_dan_email_valid(admin_client):
    kosong = admin_client.post("/api/v1/pelanggan/", {"nama": "   "}, format="json")
    assert kosong.status_code == 400
    assert "nama" in kosong.json()

    tanpa_nama = admin_client.post("/api/v1/pelanggan/", {}, format="json")
    assert tanpa_nama.status_code == 400
    assert "nama" in tanpa_nama.json()

    email_salah = admin_client.post(
        "/api/v1/pelanggan/", {"nama": "Budi", "email": "bukan-email"}, format="json"
    )
    assert email_salah.status_code == 400
    assert "email" in email_salah.json()


def test_telepon_opsional_dan_boleh_kosong_berulang(admin_client):
    for nama in ("Pelanggan A", "Pelanggan B"):
        response = admin_client.post(
            "/api/v1/pelanggan/", {"nama": nama}, format="json"
        )
        assert response.status_code == 201, response.content
        assert response.json()["telepon"] == ""
    assert Pelanggan.objects.filter(telepon="").count() == 2


def test_telepon_duplikat_ditolak(admin_client, pelanggan):
    response = admin_client.post(
        "/api/v1/pelanggan/",
        {"nama": "Nama Lain", "telepon": "+62 812-8690-1234"},
        format="json",
    )
    assert response.status_code == 400
    assert "telepon" in response.json()


def test_ubah_pelanggan_tidak_menyentuh_transaksi(admin_client, user, pelanggan):
    _pesanan(user, pelanggan, nomor="MK-UBAH-1", total=150_000)

    response = admin_client.patch(
        f"/api/v1/pelanggan/{pelanggan.pk}/",
        {"nama": "Rina W.", "alamat": "Jl. Baru 2"},
        format="json",
    )
    assert response.status_code == 200, response.content
    assert response.json()["nama"] == "Rina W."
    assert response.json()["jumlah_transaksi"] == 1

    pesanan = Pesanan.objects.get(nomor="MK-UBAH-1")
    assert pesanan.pelanggan_id == pelanggan.pk
    assert pesanan.nama_lengkap == "Rina Wulandari"


def test_detail_dan_statistik_hanya_status_berhasil(admin_client, user, pelanggan):
    _pesanan(
        user, pelanggan, nomor="MK-1", status=Pesanan.Status.SELESAI, total=100_000
    )
    _pesanan(
        user, pelanggan, nomor="MK-2", status=Pesanan.Status.DIBAYAR, total=200_000
    )
    _pesanan(
        user, pelanggan, nomor="MK-3", status=Pesanan.Status.MENUNGGU, total=999_000
    )
    _pesanan(user, pelanggan, nomor="MK-4", status=Pesanan.Status.BATAL, total=888_000)

    data = admin_client.get(f"/api/v1/pelanggan/{pelanggan.pk}/").json()
    assert data["jumlah_transaksi"] == 2
    assert data["total_belanja"] == 300_000
    assert data["terakhir_belanja"] is not None
    assert data["statistik"] == {
        "jumlah_transaksi": 2,
        "total_belanja": 300_000,
        "rata_rata_transaksi": 150_000,
        "transaksi_selesai": 1,
        "terakhir_belanja": data["terakhir_belanja"],
    }


def test_riwayat_pesanan_dengan_item(admin_client, user, pelanggan, varian):
    pesanan = _pesanan(user, pelanggan, nomor="MK-ITEM-1", total=730_000)
    ItemPesanan.objects.create(
        pesanan=pesanan,
        varian=varian,
        nama="Kemeja Parang Indigo",
        slug="kemeja-parang-indigo",
        motif="parang",
        bentuk="kemeja",
        warna="indigo",
        ukuran="L",
        sku=varian.sku,
        harga=365_000,
        jumlah=2,
    )

    response = admin_client.get(f"/api/v1/pelanggan/{pelanggan.pk}/pesanan/")
    assert response.status_code == 200
    assert response.json()["count"] == 1
    baris = response.json()["results"][0]
    assert baris["nomor"] == "MK-ITEM-1"
    assert baris["produk"] == ["Kemeja Parang Indigo"]
    assert baris["jumlah_item"] == 2
    assert baris["status_label"] == "Selesai"
    assert baris["metode_label"] == "Transfer Bank"


def test_riwayat_pesanan_berpaginasi(admin_client, user, pelanggan):
    for i in range(30):
        _pesanan(user, pelanggan, nomor=f"MK-PAGE-{i:02d}", total=10_000)

    response = admin_client.get(
        f"/api/v1/pelanggan/{pelanggan.pk}/pesanan/?per_halaman=10&page=3"
    )
    assert response.status_code == 200
    data = response.json()
    assert data["count"] == 30
    assert len(data["results"]) == 10


def test_pelanggan_tanpa_transaksi(admin_client, pelanggan):
    data = admin_client.get(f"/api/v1/pelanggan/{pelanggan.pk}/").json()
    assert data["jumlah_transaksi"] == 0
    assert data["total_belanja"] == 0
    assert data["terakhir_belanja"] is None
    assert data["statistik"]["rata_rata_transaksi"] == 0
    assert data["statistik"]["transaksi_selesai"] == 0

    riwayat = admin_client.get(f"/api/v1/pelanggan/{pelanggan.pk}/pesanan/").json()
    assert riwayat["count"] == 0
    assert riwayat["results"] == []


def test_transaksi_tanpa_pelanggan_tetap_valid(admin_client, user):
    _pesanan(user, None, nomor="MK-TAMU-1")

    data = admin_client.get("/api/v1/pelanggan/").json()
    assert data["count"] == 0
    assert Pesanan.objects.get(nomor="MK-TAMU-1").pelanggan is None


def test_ringkasan_pelanggan(admin_client, user, pelanggan):
    lain = Pelanggan.objects.create(nama="Tanpa Belanja")
    _pesanan(user, pelanggan, nomor="MK-R-1", total=100_000)
    _pesanan(user, pelanggan, nomor="MK-R-2", total=50_000)
    _pesanan(user, pelanggan, nomor="MK-R-3", status=Pesanan.Status.BATAL)
    _pesanan(user, None, nomor="MK-R-4", total=777_000)

    data = admin_client.get("/api/v1/pelanggan/ringkasan/").json()
    assert data == {
        "total_pelanggan": Pelanggan.objects.count(),
        "pelanggan_dengan_transaksi": 1,
        "total_transaksi": 2,
        "total_nilai_transaksi": 150_000,
    }
    assert Pelanggan.objects.filter(pk=lain.pk).exists()


def test_cari_pelanggan_di_server(admin_client):
    Pelanggan.objects.create(
        nama="Siti Aminah", telepon="081111111111", email="siti@toko.test"
    )
    Pelanggan.objects.create(
        nama="Budi Santoso", telepon="082222222222", email="budi@toko.test"
    )

    for q in ("siti", "08111", "BUDI@TOKO"):
        response = admin_client.get(f"/api/v1/pelanggan/?q={q}")
        assert response.status_code == 200
        assert response.json()["count"] == 1, q


def test_paginasi_dan_sortir_pelanggan(admin_client):
    for i in range(30):
        Pelanggan.objects.create(nama=f"Pelanggan {i:02d}")

    data = admin_client.get("/api/v1/pelanggan/?per_halaman=10&page=2").json()
    assert data["count"] == 30
    assert len(data["results"]) == 10

    data = admin_client.get("/api/v1/pelanggan/?sortir=nama&arah=desc").json()
    nama = [baris["nama"] for baris in data["results"]]
    assert nama == sorted(nama, reverse=True)


def test_hapus_pelanggan(admin_client, user, pelanggan):
    tanpa_transaksi = Pelanggan.objects.create(nama="Tanpa Transaksi")
    assert (
        admin_client.delete(f"/api/v1/pelanggan/{tanpa_transaksi.pk}/").status_code
        == 204
    )
    assert not Pelanggan.objects.filter(pk=tanpa_transaksi.pk).exists()

    pesanan = _pesanan(user, pelanggan, nomor="MK-HAPUS-1")
    response = admin_client.delete(f"/api/v1/pelanggan/{pelanggan.pk}/")
    assert response.status_code == 409
    assert response.json()["code"] == "PELANGGAN_PUNYA_TRANSAKSI"
    assert Pelanggan.objects.filter(pk=pelanggan.pk).exists()
    assert Pesanan.objects.get(pk=pesanan.pk).pelanggan_id == pelanggan.pk


def test_matriks_izin_endpoint_pelanggan(
    admin, pelanggan, admin_client, kasir_client, user_client
):
    tamu = APIClient()
    tanpa_2fa = APIClient()
    tanpa_2fa.force_login(admin)
    detail = f"/api/v1/pelanggan/{pelanggan.pk}/"
    riwayat = f"{detail}pesanan/"
    ringkasan = "/api/v1/pelanggan/ringkasan/"

    for client in (admin_client, kasir_client):
        assert client.get("/api/v1/pelanggan/").status_code == 200
        assert (
            client.post(
                "/api/v1/pelanggan/", {"nama": "Pelanggan Baru"}, format="json"
            ).status_code
            == 201
        )
    for client in (user_client,):
        assert client.get("/api/v1/pelanggan/").status_code == 403
        assert (
            client.post("/api/v1/pelanggan/", {"nama": "X"}, format="json").status_code
            == 403
        )
    assert tamu.get("/api/v1/pelanggan/").status_code == 401
    assert tanpa_2fa.get("/api/v1/pelanggan/").status_code == 403

    assert admin_client.get(detail).status_code == 200
    assert admin_client.get(riwayat).status_code == 200
    assert admin_client.get(ringkasan).status_code == 200
    assert (
        admin_client.patch(detail, {"catatan": "VIP"}, format="json").status_code == 200
    )

    for path, method in ((detail, "get"), (riwayat, "get"), (ringkasan, "get")):
        for client in (kasir_client, user_client):
            assert getattr(client, method)(path).status_code == 403
    assert (
        kasir_client.patch(detail, {"catatan": "X"}, format="json").status_code == 403
    )
    assert kasir_client.delete(detail).status_code == 403
    assert tanpa_2fa.get(detail).status_code == 403
    assert tamu.get(detail).status_code == 401
    assert tamu.delete(detail).status_code == 401


def test_checkout_menautkan_pelanggan_dari_nomor_telepon(user, varian):
    add_stock(varian.pk, 10)
    ItemKeranjang.objects.create(
        keranjang=keranjang_user(user), varian=varian, jumlah=1
    )

    pesanan = buat_pesanan(
        user,
        {
            "nama_lengkap": "Rina Wulandari",
            "whatsapp": "+62 812-8690-1234",
            "email": "rina@example.com",
            "alamat": "Jl. Komang Raya No. 18",
            "provinsi": "DKI Jakarta",
            "kota": "Jakarta Selatan",
            "kecamatan": "Mampang Prapatan",
            "kode_pos": "12730",
            "metode_bayar": "transfer_bank",
            "bank": "bca",
        },
    )

    assert pesanan.pelanggan is not None
    assert pesanan.pelanggan.telepon == "081286901234"

    pelanggan_lain = services.pelanggan_dari_kontak(
        "Nama Sama Orang Lain", "0812-8690-1234", "lain@example.com"
    )
    assert pelanggan_lain.pk == pesanan.pelanggan_id


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
