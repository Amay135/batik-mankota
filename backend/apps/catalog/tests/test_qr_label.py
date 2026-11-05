import re

import pytest
from django.core.cache import cache
from rest_framework.test import APIClient

from apps.accounts import totp
from apps.accounts.models import User
from apps.catalog import qr
from apps.catalog.models import Kategori, Motif, Produk, Varian

PASSWORD = "rahasia-kuat-1"


@pytest.fixture(autouse=True)
def _bersihkan_cache():
    cache.clear()


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
    client = APIClient()
    assert (
        client.post(
            "/api/v1/auth/masuk/",
            {"email": user.email, "password": PASSWORD},
            format="json",
        ).status_code
        == 200
    )
    assert (
        client.post(
            "/api/v1/auth/2fa/verify/",
            {"code": totp.code_at(user.otp_secret)},
            format="json",
        ).status_code
        == 200
    )
    return client


@pytest.fixture
def produk(db):
    kategori = Kategori.objects.create(
        nama="Batik Pria", slug="batik-pria", label_pendek="Pria"
    )
    motif = Motif.objects.create(nama="Parang", slug="parang")
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


def test_isi_qr_memakai_site_url(varian, settings):
    assert qr.qr_content(varian) == (
        f"{settings.SITE_URL.rstrip('/')}/q/{varian.qr_token}"
    )


def test_qr_svg_dan_png(admin, varian):
    url = f"/api/v1/katalog/varian/{varian.pk}/qr/"

    response = admin.get(url)
    assert response.status_code == 200
    assert response["Content-Type"].startswith("image/svg+xml")
    assert b"<svg" in response.content

    response = admin.get(url, {"format": "png"})
    assert response.status_code == 200
    assert response["Content-Type"].startswith("image/png")
    assert response.content.startswith(b"\x89PNG")


def test_qr_hasil_di_cache(admin, varian, monkeypatch):
    panggilan = []
    asli = qr.qrcode.make

    def hitung(*args, **kwargs):
        panggilan.append(1)
        return asli(*args, **kwargs)

    monkeypatch.setattr(qr.qrcode, "make", hitung)
    url = f"/api/v1/katalog/varian/{varian.pk}/qr/"

    assert admin.get(url).status_code == 200
    assert admin.get(url).status_code == 200
    assert len(panggilan) == 1


def test_format_qr_asing_ditolak(admin, varian):
    response = admin.get(f"/api/v1/katalog/varian/{varian.pk}/qr/", {"format": "gif"})
    assert response.status_code == 400
    assert response.json()["code"] == "FORMAT_TIDAK_DIDUKUNG"


def test_pdf_label_terbentuk(admin, varian):
    response = admin.post(
        "/api/v1/katalog/label/",
        {"ukuran": "40x30", "varian": [{"id": varian.pk, "salinan": 2}]},
        format="json",
    )
    assert response.status_code == 200
    assert response["Content-Type"].startswith("application/pdf")
    assert response.content.startswith(b"%PDF")
    assert len(re.findall(rb"/Type\s*/Page\b", response.content)) == 2


def test_pdf_label_massal_per_produk(admin, produk, varian):
    Varian.objects.create(produk=produk, warna="soga", ukuran="M", sku="KM-002-SG-M")
    response = admin.post(
        "/api/v1/katalog/label/",
        {"ukuran": "58x40", "produk": produk.pk},
        format="json",
    )
    assert response.status_code == 200
    assert response.content.startswith(b"%PDF")


def test_label_tanpa_varian_ditolak(admin, db):
    response = admin.post("/api/v1/katalog/label/", {}, format="json")
    assert response.status_code == 400


def test_label_ukuran_asing_ditolak(admin, varian):
    response = admin.post(
        "/api/v1/katalog/label/",
        {"ukuran": "99x99", "varian": [{"id": varian.pk}]},
        format="json",
    )
    assert response.status_code == 400


def test_qr_svg_menegakkan_izin(varian):
    url = f"/api/v1/katalog/varian/{varian.pk}/qr/"
    assert APIClient().get(url, {"format": "svg"}).status_code == 401

    for role in (User.Role.KASIR, User.Role.USER):
        client = APIClient()
        client.force_login(
            User.objects.create_user(
                email=f"{role}@mankota.test",
                password=PASSWORD,
                nama_lengkap=role,
                role=role,
            )
        )
        assert client.get(url, {"format": "svg"}).status_code == 403

    admin = User.objects.create_user(
        email="admin-qr@mankota.test",
        password=PASSWORD,
        nama_lengkap="Admin",
        role=User.Role.ADMIN,
        otp_enabled=True,
    )
    client = APIClient()
    client.force_login(admin)
    assert client.get(url, {"format": "svg"}).status_code == 403


@pytest.mark.parametrize("salinan", [0, -1, 101])
def test_label_salinan_dibatasi(admin, varian, salinan):
    response = admin.post(
        "/api/v1/katalog/label/",
        {"varian": [{"id": varian.pk, "salinan": salinan}]},
        format="json",
    )
    assert response.status_code == 400


def test_label_total_halaman_dibatasi(admin, produk):
    ids = [
        Varian.objects.create(
            produk=produk, warna=warna, ukuran=ukuran, sku=f"BATAS-{i}"
        ).pk
        for i, (warna, ukuran) in enumerate(
            [
                ("indigo", "S"),
                ("soga", "S"),
                ("krem", "S"),
                ("hitam", "S"),
                ("indigo", "M"),
                ("soga", "M"),
            ]
        )
    ]
    response = admin.post(
        "/api/v1/katalog/label/",
        {"varian": [{"id": pk, "salinan": 100} for pk in ids]},
        format="json",
    )
    assert response.status_code == 400


def test_label_varian_tidak_ada_ditolak(admin, db):
    response = admin.post(
        "/api/v1/katalog/label/", {"varian": [{"id": 999999}]}, format="json"
    )
    assert response.status_code == 400


def test_label_varian_nonaktif_ditolak(admin, varian):
    varian.aktif = False
    varian.save(update_fields=["aktif"])
    response = admin.post(
        "/api/v1/katalog/label/", {"varian": [{"id": varian.pk}]}, format="json"
    )
    assert response.status_code == 400


def test_pdf_label_tanpa_harga_beli(admin, varian):
    response = admin.post(
        "/api/v1/katalog/label/", {"varian": [{"id": varian.pk}]}, format="json"
    )
    assert response.status_code == 200
    assert b"365.000" in response.content
    assert b"200.000" not in response.content
