import pytest
from django.core.cache import cache
from django.urls import URLPattern, URLResolver, get_resolver
from rest_framework.test import APIClient

from apps.accounts import totp
from apps.accounts.admin_scope import ADMIN_CAPABILITIES
from apps.accounts.models import User
from apps.accounts.permissions import IsAdmin, IsAdminBootstrap, IsKasirOrAdmin
from apps.audit.models import AuditLog

FASE_SAAT_INI = 0
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
        assert (
            client.post("/api/v1/keranjang/voucher/", {}, format="json").status_code
            == 403
        )
        assert client.get("/api/v1/pesanan/").status_code == 403
        assert client.get("/api/v1/pesanan/MK-XXX/").status_code == 403


@pytest.mark.skip(reason="cost_price belum ada; ADM-10 fase 1")
def test_cost_price_hanya_untuk_admin():
    pass
