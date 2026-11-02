import time

import pytest
from django.db.models import Sum
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.admin_scope import ADMIN_CAPABILITIES
from apps.accounts.models import User
from apps.accounts.permissions import ADMIN_2FA_AT_SESSION_KEY, ADMIN_2FA_SESSION_KEY
from apps.audit.models import AuditLog
from apps.catalog.models import Varian
from apps.inventory import services
from apps.inventory.models import Stock, StockMovement, StockOpname

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
        nama_lengkap="Pelanggan",
    )


def _login_terverifikasi(user):
    client = APIClient()
    client.force_login(user)
    session = client.session
    session[ADMIN_2FA_SESSION_KEY] = user.pk
    session[ADMIN_2FA_AT_SESSION_KEY] = int(time.time())
    session.save()
    return client


@pytest.fixture
def admin_client(admin):
    return _login_terverifikasi(admin)


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


def test_matriks_izin_endpoint_stok(
    admin, varian, admin_client, kasir_client, user_client
):
    tamu = APIClient()
    tanpa_2fa = APIClient()
    tanpa_2fa.force_login(admin)
    minimum = f"/api/v1/stok/{varian.pk}/minimum/"

    for client in (admin_client, kasir_client):
        assert client.get("/api/v1/stok/").status_code == 200
        assert client.get("/api/v1/stok/menipis/").status_code == 200
    assert user_client.get("/api/v1/stok/").status_code == 403
    assert tamu.get("/api/v1/stok/").status_code == 401

    assert admin_client.get("/api/v1/stok/mutasi/").status_code == 200
    assert kasir_client.get("/api/v1/stok/mutasi/").status_code == 403
    assert user_client.get("/api/v1/stok/mutasi/").status_code == 403
    assert tamu.get("/api/v1/stok/mutasi/").status_code == 401

    for path in ("/api/v1/stok/penyesuaian/", "/api/v1/stok/opname/"):
        assert admin_client.post(path, {}, format="json").status_code == 400
        assert kasir_client.post(path, {}, format="json").status_code == 403
        assert user_client.post(path, {}, format="json").status_code == 403
        assert tamu.post(path, {}, format="json").status_code == 401

    terapkan = "/api/v1/stok/opname/999999/terapkan/"
    assert admin_client.post(terapkan).status_code == 404
    assert kasir_client.post(terapkan).status_code == 403
    assert user_client.post(terapkan).status_code == 403
    assert tamu.post(terapkan).status_code == 401

    detail = "/api/v1/stok/opname/999999/"
    assert admin_client.get(detail).status_code == 404
    assert kasir_client.get(detail).status_code == 403
    assert user_client.get(detail).status_code == 403
    assert tamu.get(detail).status_code == 401

    assert admin_client.patch(minimum, {}, format="json").status_code == 400
    assert kasir_client.patch(minimum, {}, format="json").status_code == 403
    assert user_client.patch(minimum, {}, format="json").status_code == 403
    assert tamu.patch(minimum, {}, format="json").status_code == 401

    for path in (
        "/api/v1/stok/",
        "/api/v1/stok/menipis/",
        "/api/v1/stok/mutasi/",
        detail,
    ):
        assert tanpa_2fa.get(path).status_code == 403
    for path in (
        "/api/v1/stok/penyesuaian/",
        "/api/v1/stok/opname/",
        terapkan,
    ):
        assert tanpa_2fa.post(path, {}, format="json").status_code == 403
    assert tanpa_2fa.patch(minimum, {}, format="json").status_code == 403


def test_stok_menampilkan_angka_persis_dan_filter(varian, admin_client, kasir_client):
    services.add_stock(varian.pk, 10)
    services.reserve([(varian.pk, 4)], order_ref="ORD-API")

    for client in (admin_client, kasir_client):
        response = client.get("/api/v1/stok/")
        assert response.status_code == 200
        baris = response.json()["results"][0]
        assert baris["varian"] == varian.pk
        assert baris["stok_fisik"] == 10
        assert baris["stok_terpesan"] == 4
        assert baris["stok_tersedia"] == 6
        assert baris["stok_minimum"] == 5
        assert baris["status_stok"] == "Tersedia"

    for params in (
        {"q": "KM-001"},
        {"kategori": "batik-pria"},
        {"ukuran": "L"},
        {"warna": "indigo"},
    ):
        response = admin_client.get("/api/v1/stok/", params)
        assert response.status_code == 200
        assert response.json()["count"] == 1, params

    assert admin_client.get("/api/v1/stok/", {"q": "tidak-ada"}).json()["count"] == 0
    assert admin_client.get("/api/v1/stok/", {"ukuran": "XXX"}).status_code == 400


def test_stok_menipis_memakai_tersedia_dan_min_stock(produk, varian, admin_client):
    services.add_stock(varian.pk, 5)
    cukup = Varian.objects.create(
        produk=produk, warna="soga", ukuran="M", sku="KM-002-SG-M"
    )
    services.add_stock(cukup.pk, 6)

    response = admin_client.get("/api/v1/stok/menipis/")
    assert response.status_code == 200
    data = response.json()
    assert data["count"] == 1
    assert data["results"][0]["varian"] == varian.pk

    services.reserve([(varian.pk, 2)], order_ref="ORD-MENIPIS")
    assert admin_client.get("/api/v1/stok/menipis/").json()["count"] == 1


def test_mutasi_admin_dan_filter(admin, varian, admin_client, kasir_client):
    services.add_stock(varian.pk, 10)
    services.adjust(varian.pk, -2, actor=admin, note="rusak")

    assert kasir_client.get("/api/v1/stok/mutasi/").status_code == 403

    response = admin_client.get("/api/v1/stok/mutasi/")
    assert response.status_code == 200
    assert response.json()["count"] == 2
    assert response.json()["results"][0]["tipe"] == StockMovement.Type.ADJUST

    assert (
        admin_client.get(
            "/api/v1/stok/mutasi/", {"tipe": StockMovement.Type.ADJUST}
        ).json()["count"]
        == 1
    )
    assert (
        admin_client.get("/api/v1/stok/mutasi/", {"varian_id": varian.pk}).json()[
            "count"
        ]
        == 2
    )
    assert (
        admin_client.get("/api/v1/stok/mutasi/", {"varian_id": 999999}).json()["count"]
        == 0
    )

    hari_ini = timezone.localdate().isoformat()
    assert (
        admin_client.get("/api/v1/stok/mutasi/", {"dari": hari_ini}).json()["count"]
        == 2
    )
    assert (
        admin_client.get("/api/v1/stok/mutasi/", {"dari": "2999-01-01"}).json()["count"]
        == 0
    )


def test_penyesuaian_menulis_ledger_dan_audit(admin, admin_client, varian):
    services.add_stock(varian.pk, 10)

    response = admin_client.post(
        "/api/v1/stok/penyesuaian/",
        {"varian_id": varian.pk, "qty_delta": -3, "alasan": "rusak"},
        format="json",
    )
    assert response.status_code == 201
    assert response.json()["qty_delta"] == -3
    assert response.json()["tipe"] == StockMovement.Type.ADJUST
    assert response.json()["catatan"] == "rusak"

    assert Stock.objects.get(variant=varian).qty_on_hand == 7
    movement = StockMovement.objects.get(variant=varian, type=StockMovement.Type.ADJUST)
    assert movement.qty_delta == -3
    audit = AuditLog.objects.get(action=AuditLog.Action.STOCK_ADJUST)
    assert audit.actor == admin
    assert audit.entity_id == str(varian.pk)
    assert audit.before == {"qty_on_hand": 10}
    assert audit.after == {"qty_on_hand": 7}


def test_penyesuaian_menolak_alasan_kosong_dan_stok_negatif(admin_client, varian):
    services.add_stock(varian.pk, 10)

    for payload, kode in (
        ({"varian_id": varian.pk, "qty_delta": 1, "alasan": "   "}, 400),
        ({"varian_id": varian.pk, "qty_delta": 0, "alasan": "nol"}, 400),
        ({"varian_id": varian.pk, "qty_delta": -100, "alasan": "terlalu banyak"}, 409),
    ):
        response = admin_client.post(
            "/api/v1/stok/penyesuaian/", payload, format="json"
        )
        assert response.status_code == kode, payload
        if kode == 409:
            assert response.json()["code"] == "INSUFFICIENT_STOCK"

    assert Stock.objects.get(variant=varian).qty_on_hand == 10
    assert not StockMovement.objects.filter(
        variant=varian, type=StockMovement.Type.ADJUST
    ).exists()
    assert not AuditLog.objects.filter(action=AuditLog.Action.STOCK_ADJUST).exists()


def test_opname_selisih_dan_terapkan(admin, admin_client, produk, varian):
    services.add_stock(varian.pk, 10, actor=admin)
    lebih = Varian.objects.create(
        produk=produk, warna="soga", ukuran="M", sku="KM-002-SG-M"
    )
    services.add_stock(lebih.pk, 4, actor=admin)
    tetap = Varian.objects.create(
        produk=produk, warna="krem", ukuran="S", sku="KM-003-KR-S"
    )
    services.add_stock(tetap.pk, 3, actor=admin)

    response = admin_client.post(
        "/api/v1/stok/opname/",
        {
            "catatan": "hitung bulanan",
            "items": [
                {"varian_id": varian.pk, "qty_fisik": 7},
                {"varian_id": lebih.pk, "qty_fisik": 6},
                {"varian_id": tetap.pk, "qty_fisik": 3},
            ],
        },
        format="json",
    )
    assert response.status_code == 201, response.content
    opname_id = response.json()["id"]
    assert response.json()["status"] == StockOpname.Status.DRAFT

    selisih = {i["varian"]: i["selisih"] for i in response.json()["items"]}
    assert selisih == {varian.pk: -3, lebih.pk: 2, tetap.pk: 0}
    assert Stock.objects.get(variant=varian).qty_on_hand == 10

    detail = admin_client.get(f"/api/v1/stok/opname/{opname_id}/")
    assert detail.status_code == 200
    assert detail.json()["catatan"] == "hitung bulanan"

    terapkan = admin_client.post(f"/api/v1/stok/opname/{opname_id}/terapkan/")
    assert terapkan.status_code == 200
    assert terapkan.json()["status"] == StockOpname.Status.APPLIED
    assert Stock.objects.get(variant=varian).qty_on_hand == 7
    assert Stock.objects.get(variant=lebih).qty_on_hand == 6
    assert Stock.objects.get(variant=tetap).qty_on_hand == 3

    movements = StockMovement.objects.filter(type=StockMovement.Type.OPNAME)
    assert movements.count() == 2
    assert all(m.ref_type == "opname" for m in movements)
    assert all(m.ref_id == str(opname_id) for m in movements)
    assert AuditLog.objects.filter(action=AuditLog.Action.STOCK_ADJUST).count() == 2

    total_ledger = StockMovement.objects.filter(variant=varian).aggregate(
        total=Sum("qty_delta")
    )["total"]
    assert total_ledger == Stock.objects.get(variant=varian).qty_on_hand

    ulang = admin_client.post(f"/api/v1/stok/opname/{opname_id}/terapkan/")
    assert ulang.status_code == 409
    assert ulang.json()["code"] == "OPNAME_ALREADY_APPLIED"
    assert StockMovement.objects.filter(type=StockMovement.Type.OPNAME).count() == 2


def test_opname_ditolak_bila_hitungan_di_bawah_reserved(admin_client, varian):
    services.add_stock(varian.pk, 5)
    services.reserve([(varian.pk, 3)], order_ref="ORD-RESERVED")

    response = admin_client.post(
        "/api/v1/stok/opname/",
        {
            "catatan": "hitung",
            "items": [{"varian_id": varian.pk, "qty_fisik": 1}],
        },
        format="json",
    )
    assert response.status_code == 201
    opname_id = response.json()["id"]

    terapkan = admin_client.post(f"/api/v1/stok/opname/{opname_id}/terapkan/")
    assert terapkan.status_code == 409
    assert terapkan.json()["code"] == "INSUFFICIENT_STOCK"
    assert StockOpname.objects.get(pk=opname_id).status == StockOpname.Status.DRAFT
    assert Stock.objects.get(variant=varian).qty_on_hand == 5
    assert not StockMovement.objects.filter(type=StockMovement.Type.OPNAME).exists()


def test_id_registry_route_stok_sesuai_kesepakatan():
    peta = {(e["path"], e["method"]): e["id"] for e in ADMIN_CAPABILITIES}
    assert peta[("/api/v1/stok/", "GET")] == "ADM-12"
    assert peta[("/api/v1/stok/mutasi/", "GET")] == "ADM-12"
    assert peta[("/api/v1/stok/penyesuaian/", "POST")] == "ADM-12"
    assert peta[("/api/v1/stok/opname/", "POST")] == "ADM-13"
    assert peta[("/api/v1/stok/opname/<int:pk>/", "GET")] == "ADM-13"
    assert peta[("/api/v1/stok/opname/<int:pk>/terapkan/", "POST")] == "ADM-13"
    assert peta[("/api/v1/stok/menipis/", "GET")] == "ADM-14"
    assert peta[("/api/v1/stok/<int:pk>/minimum/", "PATCH")] == "ADM-14"


def test_minimum_stok_hanya_admin_validasi_dan_audit(
    admin, varian, admin_client, kasir_client, user_client
):
    services.add_stock(varian.pk, 5)
    url = f"/api/v1/stok/{varian.pk}/minimum/"
    payload = {"min_stock": 2, "alasan": "stok aman"}
    tamu = APIClient()

    assert kasir_client.patch(url, payload, format="json").status_code == 403
    assert user_client.patch(url, payload, format="json").status_code == 403
    assert tamu.patch(url, payload, format="json").status_code == 401

    for salah in (
        {"min_stock": -1, "alasan": "negatif"},
        {"min_stock": 3},
        {"min_stock": 3, "alasan": "   "},
        {"min_stock": "x", "alasan": "bukan angka"},
    ):
        assert admin_client.patch(url, salah, format="json").status_code == 400, salah

    assert admin_client.get("/api/v1/stok/menipis/").json()["count"] == 1

    response = admin_client.patch(url, payload, format="json")
    assert response.status_code == 200
    assert response.json()["stok_minimum"] == 2
    assert Stock.objects.get(variant=varian).qty_on_hand == 5
    assert not StockMovement.objects.filter(type=StockMovement.Type.ADJUST).exists()

    audit = AuditLog.objects.get(action=AuditLog.Action.MIN_STOCK_CHANGE)
    assert audit.actor == admin
    assert audit.before == {"min_stock": 5}
    assert audit.after == {"min_stock": 2}
    assert admin_client.get("/api/v1/stok/menipis/").json()["count"] == 0

    assert (
        admin_client.patch(
            "/api/v1/stok/999999/minimum/", payload, format="json"
        ).status_code
        == 404
    )


def test_opname_delta_snapshot_mempertahankan_perubahan_setelah_sesi(
    admin, varian, admin_client
):
    services.add_stock(varian.pk, 10)
    dibuat = admin_client.post(
        "/api/v1/stok/opname/",
        {
            "catatan": "hitung",
            "items": [{"varian_id": varian.pk, "qty_fisik": 7}],
        },
        format="json",
    )
    assert dibuat.status_code == 201
    opname_id = dibuat.json()["id"]
    assert dibuat.json()["items"][0]["selisih"] == -3

    services.adjust(varian.pk, -2, actor=admin, note="penjualan setelah hitung")
    assert Stock.objects.get(variant=varian).qty_on_hand == 8

    terapkan = admin_client.post(f"/api/v1/stok/opname/{opname_id}/terapkan/")
    assert terapkan.status_code == 200
    assert Stock.objects.get(variant=varian).qty_on_hand == 5


def test_opname_hasil_negatif_ditolak_409(admin, varian, admin_client):
    services.add_stock(varian.pk, 10)
    dibuat = admin_client.post(
        "/api/v1/stok/opname/",
        {
            "catatan": "hitung",
            "items": [{"varian_id": varian.pk, "qty_fisik": 0}],
        },
        format="json",
    )
    assert dibuat.status_code == 201
    opname_id = dibuat.json()["id"]

    services.adjust(varian.pk, -5, actor=admin, note="penjualan setelah hitung")

    terapkan = admin_client.post(f"/api/v1/stok/opname/{opname_id}/terapkan/")
    assert terapkan.status_code == 409
    assert terapkan.json()["code"] == "INSUFFICIENT_STOCK"
    assert Stock.objects.get(variant=varian).qty_on_hand == 5
    assert StockOpname.objects.get(pk=opname_id).status == StockOpname.Status.DRAFT
    assert not StockMovement.objects.filter(type=StockMovement.Type.OPNAME).exists()


def test_respons_stok_tanpa_harga_beli(admin, varian, admin_client):
    services.add_stock(varian.pk, 10)
    services.adjust(varian.pk, -1, actor=admin, note="rusak")
    dibuat = admin_client.post(
        "/api/v1/stok/opname/",
        {
            "catatan": "hitung",
            "items": [{"varian_id": varian.pk, "qty_fisik": 9}],
        },
        format="json",
    )
    assert dibuat.status_code == 201

    for url in (
        "/api/v1/stok/",
        "/api/v1/stok/menipis/",
        "/api/v1/stok/mutasi/",
        f"/api/v1/stok/opname/{dibuat.json()['id']}/",
    ):
        body = admin_client.get(url).content.decode()
        assert "harga_beli" not in body, url
        assert "cost_price" not in body, url


def test_opname_validasi_masukan(admin_client, varian):
    for payload in (
        {"catatan": "  ", "items": [{"varian_id": varian.pk, "qty_fisik": 1}]},
        {"catatan": "hitung", "items": []},
        {
            "catatan": "hitung",
            "items": [
                {"varian_id": varian.pk, "qty_fisik": 1},
                {"varian_id": varian.pk, "qty_fisik": 2},
            ],
        },
        {"catatan": "hitung", "items": [{"varian_id": 999999, "qty_fisik": 1}]},
        {"catatan": "hitung", "items": [{"varian_id": varian.pk, "qty_fisik": -1}]},
    ):
        response = admin_client.post("/api/v1/stok/opname/", payload, format="json")
        assert response.status_code == 400, payload

    assert StockOpname.objects.count() == 0
