import re
import time

import pytest
from django.contrib.sessions.models import Session
from django.core.cache import cache
from django.urls import URLPattern, URLResolver, get_resolver
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts import totp
from apps.accounts.admin_scope import ADMIN_CAPABILITIES
from apps.accounts.models import User
from apps.accounts.permissions import (
    ADMIN_2FA_SESSION_KEY,
    IsAdmin,
    IsAdminBootstrap,
    IsKasirOrAdmin,
)
from apps.audit.models import AuditLog
from apps.catalog.models import Kategori, Motif, Produk, Ulasan, Varian
from apps.inventory.services import add_stock
from apps.orders.models import ItemKeranjang, ItemPesanan, Keranjang, Pesanan

FASE_SAAT_INI = 1
PASSWORD = "rahasia-kuat-1"
ADMIN_ROUTE_PERMISSIONS = (IsAdmin, IsAdminBootstrap, IsKasirOrAdmin)


@pytest.fixture(autouse=True)
def _clear_throttle_cache():
    cache.clear()


def _iter_routes(patterns, prefix=""):
    for pattern in patterns:
        if isinstance(pattern, URLResolver):
            yield from _iter_routes(pattern.url_patterns, prefix + str(pattern.pattern))
        elif isinstance(pattern, URLPattern):
            view = getattr(pattern.callback, "view_class", None)
            if view is not None:
                yield "/" + prefix + str(pattern.pattern), view


def _routes():
    return list(_iter_routes(get_resolver().url_patterns))


def _is_admin_route(view):
    return any(
        isinstance(perm, type) and issubclass(perm, ADMIN_ROUTE_PERMISSIONS)
        for perm in getattr(view, "permission_classes", [])
    )


def _methods(view):
    return {
        method.upper()
        for method in ("get", "post", "put", "patch", "delete")
        if hasattr(view, method)
    }


def _concrete(path, pk=None):
    return path.replace("<int:pk>", str(pk)) if pk is not None else path


def _call(client, entry, pk):
    path = _concrete(entry["path"], pk)
    method = entry["method"].lower()
    if method == "get":
        return client.get(path)
    return getattr(client, method)(path, {}, format="json")


def _login(user):
    client = APIClient()
    response = client.post(
        "/api/v1/auth/masuk/",
        {"email": user.email, "password": PASSWORD},
        format="json",
    )
    assert response.status_code == 200, response.content
    return client


def _verified(user):
    client = _login(user)
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
        nama_lengkap="Pelanggan",
    )


@pytest.fixture
def produk_varian(db):
    kategori = Kategori.objects.create(nama="Pria", slug="pria", label_pendek="Pria")
    motif = Motif.objects.create(nama="Parang", slug="parang")
    produk = Produk.objects.create(
        nama="Kemeja",
        slug="kemeja",
        kategori=kategori,
        teknik="cap",
        motif=motif,
        bentuk="kemeja",
        warna_utama="indigo",
        harga=365_000,
    )
    varian = Varian.objects.create(
        produk=produk,
        warna="indigo",
        ukuran="L",
        sku="SKU-1",
        harga_beli=200_000,
    )
    return produk, varian


def test_registry_matches_urlconf():
    admin_routes = {
        (path, method)
        for path, view in _routes()
        if _is_admin_route(view)
        for method in _methods(view)
    }
    registry = {
        (entry["path"], entry["method"].upper()) for entry in ADMIN_CAPABILITIES
    }
    assert admin_routes == registry


def test_registry_entries_have_real_routes():
    routes = dict(_routes())
    for entry in ADMIN_CAPABILITIES:
        if entry["fase"] > FASE_SAAT_INI:
            continue
        view = routes.get(entry["path"])
        assert view is not None, entry
        assert entry["method"].upper() in _methods(view), entry


def test_registry_id_memakai_kategori_sah():
    # ADM-xx = nomor F-ADM-xx di PRD; SEC-xx = kendali keamanan akun tanpa fitur PRD.
    pola = re.compile(r"^(ADM|SEC)-\d{2}$")
    for entry in ADMIN_CAPABILITIES:
        assert pola.fullmatch(entry["id"]), entry


def test_registry_memuat_semua_adm_fase_1():
    ids = {
        entry["id"] for entry in ADMIN_CAPABILITIES if entry["fase"] <= FASE_SAAT_INI
    }
    assert {f"ADM-{nomor}" for nomor in range(10, 17)} <= ids


def test_admin_routes_permission_matrix(admin, kasir, user):
    verified = _verified(admin)
    unverified = _login(admin)
    kasir_client = _login(kasir)
    user_client = _login(user)
    guest = APIClient()

    for entry in ADMIN_CAPABILITIES:
        if entry["fase"] > FASE_SAAT_INI:
            continue
        pk = kasir.pk

        assert _call(verified, entry, pk).status_code not in (401, 403), entry

        response = _call(unverified, entry, pk)
        if entry["requires_2fa"]:
            assert response.status_code == 403, entry
        else:
            assert response.status_code not in (401, 403), entry

        for client, role in ((kasir_client, "kasir"), (user_client, "user")):
            if role not in entry["roles"]:
                assert _call(client, entry, pk).status_code == 403, entry

        assert _call(guest, entry, pk).status_code == 401, entry


def test_setup_dan_verify_2fa(db):
    admin = User.objects.create_user(
        email="admin-baru@mankota.test",
        password=PASSWORD,
        nama_lengkap="Admin Baru",
        role=User.Role.ADMIN,
    )
    client = _login(admin)
    assert client.get("/api/v1/audit/").status_code == 403

    response = client.post("/api/v1/auth/2fa/setup/", {}, format="json")
    assert response.status_code == 200
    secret = response.json()["secret"]
    assert response.json()["otpauth_uri"].startswith("otpauth://totp/")

    wrong = f"{(int(totp.code_at(secret)) + 1) % 1000000:06d}"
    assert (
        client.post(
            "/api/v1/auth/2fa/verify/", {"code": wrong}, format="json"
        ).status_code
        == 400
    )
    assert (
        client.post(
            "/api/v1/auth/2fa/verify/", {"code": totp.code_at(secret)}, format="json"
        ).status_code
        == 200
    )
    assert client.get("/api/v1/audit/").status_code == 200

    admin.refresh_from_db()
    assert admin.otp_enabled is True

    # Sesi baru wajib verifikasi ulang.
    client.post("/api/v1/auth/keluar/")
    client = _login(admin)
    assert client.get("/api/v1/audit/").status_code == 403


def test_setup_kedua_ditolak_409(admin):
    client = _login(admin)
    response = client.post("/api/v1/auth/2fa/setup/", {}, format="json")
    assert response.status_code == 409
    assert response.json()["code"] == "TOTP_ALREADY_ENROLLED"


def test_verify_dibatasi_throttle(admin):
    client = _login(admin)
    code = totp.code_at(admin.otp_secret)
    for _ in range(5):
        assert (
            client.post(
                "/api/v1/auth/2fa/verify/", {"code": code}, format="json"
            ).status_code
            == 200
        )
    assert (
        client.post(
            "/api/v1/auth/2fa/verify/", {"code": code}, format="json"
        ).status_code
        == 429
    )


def test_verify_terkunci_setelah_gagal_berulang(admin):
    client = _login(admin)
    wrong = f"{(int(totp.code_at(admin.otp_secret)) + 1) % 1000000:06d}"
    for _ in range(5):
        assert (
            client.post(
                "/api/v1/auth/2fa/verify/", {"code": wrong}, format="json"
            ).status_code
            == 400
        )
    assert cache.get(f"2fa-lock:{admin.pk}")

    # Lepas throttle agar yang diuji benar-benar lockout akun.
    cache.delete(f"throttle_2fa_{admin.pk}")
    cache.delete("throttle_ip_2fa_127.0.0.1")
    response = client.post(
        "/api/v1/auth/2fa/verify/",
        {"code": totp.code_at(admin.otp_secret)},
        format="json",
    )
    assert response.status_code == 429
    assert response.json()["code"] == "TOTP_LOCKED"


def test_verify_tidak_berlaku_setelah_logout(admin):
    client = _verified(admin)
    assert client.get("/api/v1/audit/").status_code == 200

    # Login ulang di sesi yang sama membuang bukti verifikasi.
    client.post(
        "/api/v1/auth/masuk/",
        {"email": admin.email, "password": PASSWORD},
        format="json",
    )
    assert client.get("/api/v1/audit/").status_code == 403

    client = _verified(admin)
    client.post("/api/v1/auth/keluar/")
    client = _login(admin)
    assert client.get("/api/v1/audit/").status_code == 403


def test_saya_memuat_role_dan_status_2fa(admin):
    client = _login(admin)
    data = client.get("/api/v1/auth/saya/").json()
    assert {"id", "email", "nama_lengkap", "whatsapp"} <= data.keys()
    assert data["role"] == "admin"
    assert data["totp_enrolled"] is True
    assert data["totp_verified"] is False

    assert (
        client.post(
            "/api/v1/auth/2fa/verify/",
            {"code": totp.code_at(admin.otp_secret)},
            format="json",
        ).status_code
        == 200
    )
    assert client.get("/api/v1/auth/saya/").json()["totp_verified"] is True

    # Role read-only: PATCH profil tidak boleh menaikkan hak akses.
    response = client.patch("/api/v1/auth/saya/", {"role": "kasir"}, format="json")
    assert response.status_code == 200
    assert response.json()["role"] == "admin"


def test_audit_login_dan_role_change(admin, kasir, user):
    _login(admin)
    assert (
        AuditLog.objects.filter(action=AuditLog.Action.ADMIN_LOGIN, actor=admin).count()
        == 1
    )

    _login(user)
    assert AuditLog.objects.filter(action=AuditLog.Action.ADMIN_LOGIN).count() == 1

    client = _verified(admin)
    response = client.patch(
        f"/api/v1/auth/akun/{kasir.pk}/", {"role": "admin"}, format="json"
    )
    assert response.status_code == 200

    log = AuditLog.objects.get(action=AuditLog.Action.ROLE_CHANGE)
    assert log.actor == admin
    assert log.entity_id == str(kasir.pk)
    assert log.before == {"role": "kasir"}
    assert log.after == {"role": "admin"}


def test_audit_list_read_only(admin, user):
    client = _verified(admin)
    assert client.get("/api/v1/audit/").status_code == 200
    assert client.post("/api/v1/audit/", {}, format="json").status_code == 405
    assert client.patch("/api/v1/audit/", {}, format="json").status_code == 405
    assert client.delete("/api/v1/audit/").status_code == 405
    assert _login(user).get("/api/v1/audit/").status_code == 403


def test_admin_kelola_akun(admin, kasir, user):
    client = _verified(admin)

    data = client.get("/api/v1/auth/akun/").json()
    assert {akun["email"] for akun in data} == {admin.email, kasir.email}
    assert all("otp_secret" not in akun for akun in data)

    response = client.post(
        "/api/v1/auth/akun/",
        {
            "email": "baru@mankota.test",
            "password": PASSWORD,
            "nama_lengkap": "Kasir Baru",
            "role": "kasir",
        },
        format="json",
    )
    assert response.status_code == 201
    assert "password" not in response.json()
    assert "otp_secret" not in response.json()
    baru = User.objects.get(email="baru@mankota.test")
    assert baru.role == User.Role.KASIR
    assert baru.check_password(PASSWORD)

    response = client.post(
        "/api/v1/auth/akun/",
        {
            "email": "admin2@mankota.test",
            "password": PASSWORD,
            "nama_lengkap": "Admin 2",
            "role": "admin",
        },
        format="json",
    )
    assert response.status_code == 201

    assert (
        client.post(
            "/api/v1/auth/akun/",
            {
                "email": "bukan-staff@mankota.test",
                "password": PASSWORD,
                "nama_lengkap": "Bukan Staff",
                "role": "user",
            },
            format="json",
        ).status_code
        == 400
    )
    assert (
        client.post(
            "/api/v1/auth/akun/",
            {
                "email": "baru@mankota.test",
                "password": PASSWORD,
                "nama_lengkap": "Duplikat",
                "role": "kasir",
            },
            format="json",
        ).status_code
        == 400
    )

    assert client.get(f"/api/v1/auth/akun/{user.pk}/").status_code == 404

    response = client.patch(
        f"/api/v1/auth/akun/{baru.pk}/",
        {"nama_lengkap": "Kasir Diubah", "is_active": False},
        format="json",
    )
    assert response.status_code == 200
    baru.refresh_from_db()
    assert baru.nama_lengkap == "Kasir Diubah"
    assert baru.is_active is False

    assert (
        client.patch(
            f"/api/v1/auth/akun/{admin.pk}/", {"is_active": False}, format="json"
        ).status_code
        == 400
    )
    assert (
        client.patch(
            f"/api/v1/auth/akun/{admin.pk}/", {"role": "kasir"}, format="json"
        ).status_code
        == 400
    )

    response = client.post(
        f"/api/v1/auth/akun/{baru.pk}/reset-password/",
        {"password": "sandi-aman-9876"},
        format="json",
    )
    assert response.status_code == 204
    baru.refresh_from_db()
    assert baru.check_password("sandi-aman-9876")

    assert _login(kasir).get("/api/v1/auth/akun/").status_code == 403
    assert _login(user).get("/api/v1/auth/akun/").status_code == 403
    assert _login(admin).get("/api/v1/auth/akun/").status_code == 403
    assert APIClient().get("/api/v1/auth/akun/").status_code == 401


def test_registrasi_selalu_user(db):
    client = APIClient()
    response = client.post(
        "/api/v1/auth/daftar/",
        {
            "email": "pendaftar@mankota.test",
            "password": PASSWORD,
            "nama_lengkap": "Pendaftar",
            "role": "admin",
        },
        format="json",
    )
    assert response.status_code == 201
    assert User.objects.get(email="pendaftar@mankota.test").role == User.Role.USER


def test_customer_endpoints_reject_admin_kasir(admin, kasir):
    for client in (_verified(admin), _login(kasir)):
        assert client.get("/api/v1/keranjang/").status_code == 403
        assert (
            client.post("/api/v1/keranjang/item/", {}, format="json").status_code == 403
        )
        assert (
            client.patch("/api/v1/keranjang/item/1/", {}, format="json").status_code
            == 403
        )
        assert client.delete("/api/v1/keranjang/item/1/").status_code == 403
        assert (
            client.post("/api/v1/keranjang/voucher/", {}, format="json").status_code
            == 403
        )
        assert client.delete("/api/v1/keranjang/voucher/").status_code == 403
        assert client.get("/api/v1/pesanan/").status_code == 403
        assert client.post("/api/v1/pesanan/", {}, format="json").status_code == 403
        assert client.get("/api/v1/pesanan/MK-XXX/").status_code == 403
        assert (
            client.post(
                "/api/v1/katalog/produk/kemeja/ulasan/", {}, format="json"
            ).status_code
            == 403
        )
        assert (
            client.patch("/api/v1/katalog/ulasan/1/", {}, format="json").status_code
            == 403
        )
        assert client.delete("/api/v1/katalog/ulasan/1/").status_code == 403


def test_cost_price_hanya_untuk_admin(admin, kasir, user, produk_varian):
    produk, varian = produk_varian
    admin_client = _verified(admin)
    kasir_client = _login(kasir)
    user_client = _login(user)
    add_stock(varian.pk, 3)

    # Satu-satunya tempat harga beli keluar: serializer kelola khusus admin.
    for url in (
        f"/api/v1/katalog/kelola/produk/{produk.pk}/",
        f"/api/v1/katalog/kelola/varian/{varian.pk}/",
    ):
        body = admin_client.get(url).content
        assert b'"harga_beli"' in body, url
        assert b"200000" in body, url

    # Endpoint katalog/stok/kasir tidak memuat harga beli, termasuk untuk admin.
    for client in (admin_client, kasir_client):
        for url in ("/api/v1/stok/", f"/api/v1/kasir/varian/{varian.sku}/"):
            body = client.get(url).content
            assert b"harga_beli" not in body, url
            assert b"cost_price" not in body, url

    for client in (kasir_client, user_client):
        body = client.get(f"/api/v1/katalog/produk/{produk.slug}/").content
        assert b"harga_beli" not in body
        assert b"cost_price" not in body

    keranjang = Keranjang.objects.create(user=user)
    ItemKeranjang.objects.create(keranjang=keranjang, varian=varian, jumlah=1)
    assert b"harga_beli" not in user_client.get("/api/v1/keranjang/").content

    pesanan = Pesanan.objects.create(
        nomor="MK-UJI-ADM",
        user=user,
        nama_lengkap="Pelanggan",
        whatsapp="081234567890",
        email=user.email,
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
    body = user_client.get(f"/api/v1/pesanan/{pesanan.nomor}/").content
    assert b"harga_beli" not in body
    assert b"cost_price" not in body


def test_user_dan_tamu_tidak_menerima_angka_stok(produk_varian, user):
    produk, varian = produk_varian
    add_stock(varian.pk, 13)

    data = _login(user).get(f"/api/v1/katalog/produk/{produk.slug}/").json()
    item = next(v for v in data["varian"] if v["id"] == varian.pk)
    assert item["status_stok"] == "Tersedia"
    assert "stok" not in item

    tamu = APIClient().get(f"/api/v1/katalog/produk/{produk.slug}/").content
    assert b'"varian"' not in tamu

    client = _login(user)
    response = client.post(
        "/api/v1/keranjang/item/",
        {"varian_id": varian.pk, "jumlah": 999},
        format="json",
    )
    assert response.status_code == 400
    assert "13" not in response.content.decode()


def test_admin_tanpa_2fa_hanya_melihat_status_stok(admin, kasir, user, produk_varian):
    produk, varian = produk_varian
    add_stock(varian.pk, 13)
    url = f"/api/v1/katalog/produk/{produk.slug}/"

    def lihat_varian(client):
        response = client.get(url)
        assert response.status_code == 200
        return next(v for v in response.json()["varian"] if v["id"] == varian.pk)

    belum_2fa = lihat_varian(_login(admin))
    assert belum_2fa["status_stok"] == "Tersedia"
    assert "stok" not in belum_2fa
    assert "harga_beli" not in belum_2fa

    sudah_2fa = lihat_varian(_verified(admin))
    assert sudah_2fa["stok"] == 13
    assert "status_stok" not in sudah_2fa

    kasir_varian = lihat_varian(_login(kasir))
    assert kasir_varian["stok"] == 13
    assert "status_stok" not in kasir_varian

    user_varian = lihat_varian(_login(user))
    assert user_varian["status_stok"] == "Tersedia"
    assert "stok" not in user_varian

    tamu = APIClient().get(url).content
    assert b'"varian"' not in tamu
    assert b'"harga_beli"' not in tamu


def test_tanpa_delete_untuk_ledger_audit_transaksi(admin, user, produk_varian):
    admin_client = _verified(admin)
    assert admin_client.delete("/api/v1/stok/").status_code == 405
    assert admin_client.delete("/api/v1/stok/mutasi/").status_code == 405
    assert admin_client.delete("/api/v1/stok/penyesuaian/").status_code == 405
    assert admin_client.delete("/api/v1/audit/").status_code == 405
    assert _login(user).delete("/api/v1/pesanan/MK-XXX/").status_code == 405


def test_ubah_harga_produk_menulis_audit(admin, produk_varian):
    produk, _ = produk_varian
    response = _verified(admin).patch(
        f"/api/v1/katalog/kelola/produk/{produk.pk}/",
        {"harga": 400_000},
        format="json",
    )
    assert response.status_code == 200, response.content

    log = AuditLog.objects.get(
        action=AuditLog.Action.PRICE_CHANGE,
        entity="produk",
        entity_id=str(produk.pk),
    )
    assert log.before == {"harga": 365_000}
    assert log.after == {"harga": 400_000}


def test_ubah_harga_beli_varian_menulis_audit(admin, produk_varian):
    _, varian = produk_varian
    response = _verified(admin).patch(
        f"/api/v1/katalog/kelola/varian/{varian.pk}/",
        {"harga_beli": 210_000},
        format="json",
    )
    assert response.status_code == 200, response.content

    log = AuditLog.objects.get(
        action=AuditLog.Action.PRICE_CHANGE,
        entity="varian",
        entity_id=str(varian.pk),
    )
    assert log.before == {"harga_beli": 200_000}
    assert log.after == {"harga_beli": 210_000}


def test_penyesuaian_stok_menulis_audit(admin, produk_varian):
    _, varian = produk_varian
    add_stock(varian.pk, 10)
    response = _verified(admin).post(
        "/api/v1/stok/penyesuaian/",
        {"varian_id": varian.pk, "qty_delta": -3, "alasan": "rusak"},
        format="json",
    )
    assert response.status_code == 201, response.content

    log = AuditLog.objects.get(action=AuditLog.Action.STOCK_ADJUST)
    assert log.entity_id == str(varian.pk)
    assert log.before == {"qty_on_hand": 10}
    assert log.after == {"qty_on_hand": 7}


def test_opname_diterapkan_menulis_audit(admin, produk_varian):
    _, varian = produk_varian
    add_stock(varian.pk, 10)
    client = _verified(admin)
    created = client.post(
        "/api/v1/stok/opname/",
        {"catatan": "hitung", "items": [{"varian_id": varian.pk, "qty_fisik": 8}]},
        format="json",
    )
    assert created.status_code == 201, created.content
    applied = client.post(f"/api/v1/stok/opname/{created.json()['id']}/terapkan/")
    assert applied.status_code == 200, applied.content

    log = AuditLog.objects.get(action=AuditLog.Action.STOCK_ADJUST)
    assert log.before == {"qty_on_hand": 10}
    assert log.after == {"qty_on_hand": 8}


def test_ubah_stok_minimum_menulis_audit(admin, produk_varian):
    _, varian = produk_varian
    response = _verified(admin).patch(
        f"/api/v1/stok/{varian.pk}/minimum/",
        {"min_stock": 3, "alasan": "restock"},
        format="json",
    )
    assert response.status_code == 200, response.content

    log = AuditLog.objects.get(action=AuditLog.Action.MIN_STOCK_CHANGE)
    assert log.before == {"min_stock": 5}
    assert log.after == {"min_stock": 3}


def test_moderasi_ulasan_menulis_audit(admin, produk_varian):
    produk, _ = produk_varian
    penulis = User.objects.create_user(
        email="penulis@mankota.test",
        password=PASSWORD,
        nama_lengkap="Penulis",
    )
    ulasan = Ulasan.objects.create(produk=produk, user=penulis, rating=5)

    response = _verified(admin).patch(
        f"/api/v1/katalog/kelola/ulasan/{ulasan.pk}/",
        {"tampil": False},
        format="json",
    )
    assert response.status_code == 200, response.content

    log = AuditLog.objects.get(action=AuditLog.Action.REVIEW_MODERATE)
    assert log.entity_id == str(ulasan.pk)
    assert log.before == {"tampil": True}
    assert log.after == {"tampil": False}


def test_panduan_ukuran_menulis_audit(admin, produk_varian):
    produk, _ = produk_varian
    client = _verified(admin)
    tabel = [["Ukuran", "Lebar Dada"], ["L", "108"]]
    tabel_baru = [["Ukuran", "Lebar Dada"], ["XL", "112"]]

    created = client.post(
        "/api/v1/katalog/kelola/panduan-ukuran/",
        {"kategori": produk.kategori_id, "tabel": tabel},
        format="json",
    )
    assert created.status_code == 201, created.content
    detail = f"/api/v1/katalog/kelola/panduan-ukuran/{created.json()['id']}/"
    assert client.patch(detail, {"tabel": tabel_baru}, format="json").status_code == 200
    assert client.delete(detail).status_code == 204

    logs = list(
        AuditLog.objects.filter(action=AuditLog.Action.SIZE_GUIDE_CHANGE)
        .order_by("id")
        .values_list("before", "after")
    )
    assert logs == [
        ({}, {"tabel": tabel}),
        ({"tabel": tabel}, {"tabel": tabel_baru}),
        ({"tabel": tabel_baru}, {}),
    ]


def test_django_admin_tidak_tersedia():
    assert APIClient().get("/admin/").status_code == 404


def test_verifikasi_2fa_kedaluwarsa_setelah_12_jam(admin, monkeypatch):
    client = _verified(admin)
    assert client.get("/api/v1/audit/").status_code == 200

    maju = time.time() + 13 * 60 * 60
    monkeypatch.setattr("apps.accounts.permissions.time.time", lambda: maju)

    assert client.get("/api/v1/audit/").status_code == 403
    assert ADMIN_2FA_SESSION_KEY not in client.session


def test_reset_2fa_oleh_admin_lain(admin, kasir):
    admin2 = User.objects.create_user(
        email="admin2@mankota.test",
        password=PASSWORD,
        nama_lengkap="Admin 2",
        role=User.Role.ADMIN,
        otp_enabled=True,
        otp_secret=totp.generate_secret(),
    )
    target = _verified(admin2)
    client = _verified(admin)

    assert (
        client.post(
            f"/api/v1/auth/akun/{kasir.pk}/reset-2fa/", {}, format="json"
        ).status_code
        == 404
    )

    response = client.post(
        f"/api/v1/auth/akun/{admin2.pk}/reset-2fa/", {}, format="json"
    )
    assert response.status_code == 204

    admin2.refresh_from_db()
    assert admin2.otp_enabled is False
    assert admin2.otp_secret == ""

    log = AuditLog.objects.get(action=AuditLog.Action.OTP_RESET)
    assert log.actor == admin
    assert log.entity_id == str(admin2.pk)
    assert str(log.ip) == "127.0.0.1"
    assert log.before == {"otp_enabled": True}
    assert log.after == {"otp_enabled": False}

    # Semua sesi target dicabut, jadi permintaan berikutnya menjadi tamu.
    assert target.get("/api/v1/audit/").status_code == 401


def test_admin_tidak_bisa_reset_2fa_sendiri(admin):
    client = _verified(admin)
    response = client.post(
        f"/api/v1/auth/akun/{admin.pk}/reset-2fa/", {}, format="json"
    )
    assert response.status_code == 400

    admin.refresh_from_db()
    assert admin.otp_enabled is True
    assert admin.otp_secret != ""


def _jumlah_sesi(pk):
    return sum(
        1
        for sesi in Session.objects.all()
        if sesi.get_decoded().get("_auth_user_id") == str(pk)
    )


def test_reset_2fa_mencabut_semua_sesi_target(admin):
    admin2 = User.objects.create_user(
        email="admin2@mankota.test",
        password=PASSWORD,
        nama_lengkap="Admin 2",
        role=User.Role.ADMIN,
        otp_enabled=True,
        otp_secret=totp.generate_secret(),
    )
    _verified(admin2)
    _login(admin2)
    assert _jumlah_sesi(admin2.pk) == 2

    client = _verified(admin)
    response = client.post(
        f"/api/v1/auth/akun/{admin2.pk}/reset-2fa/", {}, format="json"
    )
    assert response.status_code == 204

    assert _jumlah_sesi(admin2.pk) == 0
    # Sesi admin pelaku tidak ikut dicabut.
    assert client.get("/api/v1/audit/").status_code == 200


def test_target_wajib_setup_ulang_2fa_setelah_reset(admin):
    admin2 = User.objects.create_user(
        email="admin2@mankota.test",
        password=PASSWORD,
        nama_lengkap="Admin 2",
        role=User.Role.ADMIN,
        otp_enabled=True,
        otp_secret=totp.generate_secret(),
    )
    secret_lama = admin2.otp_secret
    client = _verified(admin)
    assert (
        client.post(
            f"/api/v1/auth/akun/{admin2.pk}/reset-2fa/", {}, format="json"
        ).status_code
        == 204
    )

    target = _login(admin2)
    assert target.get("/api/v1/audit/").status_code == 403
    assert (
        target.post(
            "/api/v1/auth/2fa/verify/",
            {"code": totp.code_at(secret_lama)},
            format="json",
        ).status_code
        == 400
    )

    setup = target.post("/api/v1/auth/2fa/setup/", {}, format="json")
    assert setup.status_code == 200
    assert setup.json()["secret"] != secret_lama
    assert (
        target.post(
            "/api/v1/auth/2fa/verify/",
            {"code": totp.code_at(setup.json()["secret"])},
            format="json",
        ).status_code
        == 200
    )
    assert target.get("/api/v1/audit/").status_code == 200
