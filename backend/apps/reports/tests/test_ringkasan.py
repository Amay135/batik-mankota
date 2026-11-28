import time
from datetime import datetime, time as jam, timedelta

import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.accounts.permissions import ADMIN_2FA_AT_SESSION_KEY, ADMIN_2FA_SESSION_KEY
from apps.audit.models import AuditLog
from apps.catalog.models import Kategori, Motif, Produk, Varian
from apps.inventory.services import add_stock, reserve
from apps.orders.models import ItemPesanan, Pesanan

PASSWORD = "rahasia-kuat-1"
URL = "/api/v1/laporan/ringkasan/"
_nomor = 0


@pytest.fixture
def admin(db):
    return User.objects.create_user(
        email="admin-ringkasan@mankota.test",
        password=PASSWORD,
        nama_lengkap="Admin",
        role=User.Role.ADMIN,
        otp_enabled=True,
        otp_secret="JBSWY3DPEHPK3PXP",
    )


@pytest.fixture
def kasir(db):
    return User.objects.create_user(
        email="kasir-ringkasan@mankota.test",
        password=PASSWORD,
        nama_lengkap="Kasir",
        role=User.Role.KASIR,
    )


@pytest.fixture
def user(db):
    return User.objects.create_user(
        email="user-ringkasan@mankota.test",
        password=PASSWORD,
        nama_lengkap="Pelanggan",
    )


@pytest.fixture
def stok(db):
    kategori = Kategori.objects.create(nama="Pria", slug="pria", label_pendek="Pria")
    motif = Motif.objects.create(nama="Parang", slug="parang")
    produk = Produk.objects.create(
        nama="Kemeja",
        slug="kemeja-ringkasan",
        kategori=kategori,
        teknik="cap",
        motif=motif,
        bentuk="kemeja",
        warna_utama="indigo",
        harga=50_000,
    )
    tersedia = Varian.objects.create(
        produk=produk, warna="indigo", ukuran="L", sku="RK-A", harga_beli=20_000
    )
    menipis = Varian.objects.create(
        produk=produk, warna="soga", ukuran="M", sku="RK-B", harga_beli=20_000
    )
    habis = Varian.objects.create(
        produk=produk, warna="krem", ukuran="S", sku="RK-C", harga_beli=20_000
    )
    add_stock(tersedia.pk, 10)
    reserve([(tersedia.pk, 2)], order_ref="ORD-RK")
    add_stock(menipis.pk, 3)
    return tersedia, menipis, habis


def _verified(user):
    client = APIClient()
    client.force_login(user)
    session = client.session
    session[ADMIN_2FA_SESSION_KEY] = user.pk
    session[ADMIN_2FA_AT_SESSION_KEY] = int(time.time())
    session.save()
    return client


def _buat_pesanan(user, status, total, items=()):
    global _nomor
    _nomor += 1
    pesanan = Pesanan.objects.create(
        nomor=f"MK-RK-{_nomor:04d}",
        user=user,
        status=status,
        nama_lengkap="Pelanggan",
        whatsapp="081234567890",
        email=user.email,
        alamat="Jl. Uji 1",
        provinsi="Jawa Tengah",
        kota="Surakarta",
        kecamatan="Laweyan",
        kode_pos="57148",
        subtotal=total,
        ongkir=0,
        total=total,
        metode_bayar=Pesanan.Metode.TRANSFER,
        batas_bayar=timezone.now(),
    )
    for varian, jumlah, harga in items:
        ItemPesanan.objects.create(
            pesanan=pesanan,
            varian=varian,
            nama=varian.produk.nama,
            slug=varian.produk.slug,
            motif=varian.produk.motif.slug,
            bentuk=varian.produk.bentuk,
            warna=varian.warna,
            ukuran=varian.ukuran,
            sku=varian.sku,
            harga=harga,
            jumlah=jumlah,
        )
    return pesanan


def test_ringkasan_menghitung_kpi_dari_database(admin, user, stok):
    tersedia, menipis, habis = stok
    _buat_pesanan(user, Pesanan.Status.DIBAYAR, 100_000, [(tersedia, 2, 50_000)])
    _buat_pesanan(user, Pesanan.Status.SELESAI, 50_000, [(tersedia, 3, 10_000)])
    _buat_pesanan(user, Pesanan.Status.MENUNGGU, 75_000, [(menipis, 1, 75_000)])
    _buat_pesanan(user, Pesanan.Status.BATAL, 30_000, [(habis, 4, 7_500)])
    kemarin = _buat_pesanan(
        user, Pesanan.Status.DIBAYAR, 999_999, [(tersedia, 9, 111_111)]
    )
    Pesanan.objects.filter(pk=kemarin.pk).update(
        dibuat=timezone.now() - timedelta(days=1)
    )

    for _ in range(6):
        AuditLog.objects.create(
            actor=admin, action=AuditLog.Action.PRICE_CHANGE, entity="produk"
        )

    response = _verified(admin).get(URL)
    assert response.status_code == 200, response.content
    data = response.json()

    assert data["tanggal"] == timezone.localdate().isoformat()
    # Hanya pesanan dibayar/diproses/dikirim/selesai yang dihitung penjualan.
    assert data["penjualan_hari_ini"] == 150_000
    assert data["pesanan_hari_ini"] == 4
    assert data["pesanan_menunggu_pembayaran"] == 1
    # Menunggu dan batal tidak dihitung sebagai produk terjual.
    assert data["produk_terjual_hari_ini"] == 5
    assert data["varian_stok_menipis"] == 1
    assert data["varian_stok_habis"] == 1

    assert len(data["aktivitas"]) == 5
    assert data["aktivitas"][0]["aksi_label"] == "Ubah harga"
    assert data["aktivitas"][0]["pelaku"] == admin.email
    # Ringkasan tidak boleh membocorkan harga beli/HPP.
    assert "harga_beli" not in response.content.decode()
    assert "cost_price" not in response.content.decode()


def test_penjualan_memakai_batas_hari_jakarta(admin, user):
    awal_hari = timezone.make_aware(
        datetime.combine(timezone.localdate(), jam.min),
        timezone.get_current_timezone(),
    )
    dalam = _buat_pesanan(user, Pesanan.Status.DIBAYAR, 10_000)
    Pesanan.objects.filter(pk=dalam.pk).update(dibuat=awal_hari + timedelta(minutes=1))
    luar = _buat_pesanan(user, Pesanan.Status.DIBAYAR, 20_000)
    Pesanan.objects.filter(pk=luar.pk).update(dibuat=awal_hari - timedelta(minutes=1))

    data = _verified(admin).get(URL).json()
    assert data["penjualan_hari_ini"] == 10_000
    assert data["pesanan_hari_ini"] == 1


def test_ringkasan_hanya_admin_dengan_2fa(admin, kasir, user):
    assert _verified(admin).get(URL).status_code == 200

    tanpa_2fa = APIClient()
    tanpa_2fa.force_login(admin)
    assert tanpa_2fa.get(URL).status_code == 403

    for akun in (kasir, user):
        client = APIClient()
        client.force_login(akun)
        assert client.get(URL).status_code == 403

    assert APIClient().get(URL).status_code == 401
