import pytest
from django.core.cache import cache
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.catalog import services
from apps.catalog.models import Kategori, Motif, Produk, Varian
from apps.catalog.views import KatalogPagination
from apps.inventory.services import add_stock

PASSWORD = "rahasia-kuat-1"
TERLARANG_TAMU = (
    "varian",
    "stok",
    "status_stok",
    "rating",
    "jumlah_ulasan",
    "bahan_detail",
    "perawatan",
)


@pytest.fixture(autouse=True)
def _bersihkan_cache():
    cache.clear()


@pytest.fixture
def tamu():
    return APIClient()


@pytest.fixture
def kategori(db):
    return Kategori.objects.create(
        nama="Batik Pria", slug="batik-pria", label_pendek="Pria"
    )


@pytest.fixture
def motif(db):
    return Motif.objects.create(nama="Parang", slug="parang")


def _masuk(user):
    client = APIClient()
    response = client.post(
        "/api/v1/auth/masuk/",
        {"email": user.email, "password": PASSWORD},
        format="json",
    )
    assert response.status_code == 200, response.content
    return client


def _produk(
    kategori,
    motif,
    *,
    slug,
    nama=None,
    harga=365_000,
    unggulan=False,
    aktif=True,
    deskripsi="",
):
    return Produk.objects.create(
        nama=nama or slug,
        slug=slug,
        kategori=kategori,
        teknik="cap",
        motif=motif,
        bentuk="kemeja",
        warna_utama="indigo",
        harga=harga,
        unggulan=unggulan,
        aktif=aktif,
        deskripsi=deskripsi,
    )


def _pelanggan(email="pelanggan@mankota.test"):
    return User.objects.create_user(
        email=email, password=PASSWORD, nama_lengkap="Pelanggan"
    )


@pytest.fixture
def produk(kategori, motif):
    return _produk(
        kategori,
        motif,
        slug="kemeja-parang-indigo",
        nama="Kemeja Parang Indigo",
        deskripsi="Kemeja batik tulis dengan motif parang.",
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


def test_tamu_hanya_menerima_kartu_dan_detail_ringkas(tamu, produk, varian):
    daftar = tamu.get("/api/v1/katalog/produk/").json()["hasil"][0]
    assert "deskripsi_singkat" in daftar
    for field in (*TERLARANG_TAMU, "deskripsi", "foto"):
        assert field not in daftar

    detail = tamu.get(f"/api/v1/katalog/produk/{produk.slug}/").json()
    assert detail["deskripsi"]
    assert detail["foto"] == []
    for field in TERLARANG_TAMU:
        assert field not in detail


def test_user_menerima_status_stok_tanpa_angka(produk, varian):
    add_stock(varian.pk, 3)
    data = _masuk(_pelanggan()).get(f"/api/v1/katalog/produk/{produk.slug}/").json()
    v = next(item for item in data["varian"] if item["id"] == varian.pk)
    assert v["status_stok"] == "Tinggal sedikit"
    assert "stok" not in v
    assert data["tersedia"] is True


def test_harga_beli_tidak_muncul_untuk_tamu_user_dan_kasir(produk, varian):
    kasir = User.objects.create_user(
        email="kasir@mankota.test",
        password=PASSWORD,
        nama_lengkap="Kasir",
        role=User.Role.KASIR,
    )
    for client in (APIClient(), _masuk(_pelanggan()), _masuk(kasir)):
        assert b"harga_beli" not in client.get("/api/v1/katalog/produk/").content
        detail = client.get(f"/api/v1/katalog/produk/{produk.slug}/").content
        assert b"harga_beli" not in detail


def test_produk_draft_dan_varian_nonaktif_tidak_muncul(kategori, motif, produk, varian):
    draft = _produk(kategori, motif, slug="produk-draft", aktif=False)
    mati = Varian.objects.create(
        produk=produk, warna="soga", ukuran="M", sku="KM-002-SG-M"
    )
    mati.aktif = False
    mati.save(update_fields=["aktif"])
    add_stock(mati.pk, 5)

    client = _masuk(_pelanggan())
    slugs = [p["slug"] for p in client.get("/api/v1/katalog/produk/").json()["hasil"]]
    assert produk.slug in slugs
    assert draft.slug not in slugs
    assert client.get(f"/api/v1/katalog/produk/{draft.slug}/").status_code == 404

    data = client.get(f"/api/v1/katalog/produk/{produk.slug}/").json()
    assert [v["sku"] for v in data["varian"]] == [varian.sku]
    assert data["tersedia"] is False


def test_cache_tamu_tidak_bocor_ke_user(tamu, produk, varian):
    url = f"/api/v1/katalog/produk/{produk.slug}/"
    assert "varian" not in tamu.get(url).json()

    data = _masuk(_pelanggan()).get(url).json()
    assert [v["sku"] for v in data["varian"]] == [varian.sku]


def test_cache_tamu_invalidasi_saat_produk_dan_stok_berubah(tamu, produk, varian):
    url = f"/api/v1/katalog/produk/{produk.slug}/"
    assert tamu.get(url).json()["nama"] == "Kemeja Parang Indigo"

    produk.nama = "Kemeja Parang Baru"
    produk.save(update_fields=["nama"])

    assert tamu.get(url).json()["nama"] == "Kemeja Parang Baru"

    versi = services.versi_katalog()
    add_stock(varian.pk, 4)
    assert services.versi_katalog() > versi


def test_filter_cari_urut_dan_paginasi(tamu, kategori, motif):
    wanita = Kategori.objects.create(
        nama="Batik Wanita", slug="batik-wanita", label_pendek="Wanita"
    )
    kawung = Motif.objects.create(nama="Kawung", slug="kawung")
    murah = _produk(
        kategori,
        motif,
        slug="kemeja-parang",
        nama="Kemeja Parang",
        harga=100_000,
        unggulan=True,
    )
    mahal = _produk(
        wanita, kawung, slug="blus-kawung", nama="Blus Kawung", harga=300_000
    )
    sedang = _produk(
        kategori, motif, slug="kain-parang", nama="Kain Parang", harga=200_000
    )

    def slugs(**params):
        body = tamu.get("/api/v1/katalog/produk/", params).json()
        return [p["slug"] for p in body["hasil"]]

    assert slugs(kategori="batik-pria") == [murah.slug, sedang.slug]
    assert slugs(motif="kawung") == [mahal.slug]
    assert slugs(q="kawung") == [mahal.slug]
    assert slugs(unggulan="true") == [murah.slug]
    assert slugs(harga_min="150000", harga_maks="250000") == [sedang.slug]
    assert slugs(urut="harga-terendah") == [murah.slug, sedang.slug, mahal.slug]

    body = tamu.get("/api/v1/katalog/produk/", {"per_halaman": 2, "page": 2}).json()
    assert set(body) == {
        "jumlah",
        "halaman",
        "per_halaman",
        "total_halaman",
        "dari",
        "sampai",
        "hasil",
        "meta",
    }
    assert body["jumlah"] == 3
    assert body["halaman"] == 2
    assert body["per_halaman"] == 2
    assert body["total_halaman"] == 2
    assert len(body["hasil"]) == 1


def test_endpoint_motif_publik(tamu, kategori, motif, produk):
    _produk(kategori, motif, slug="produk-draft", aktif=False)
    body = tamu.get("/api/v1/katalog/motif/").json()
    assert body["total"] == 1
    item = next(m for m in body["motif"] if m["slug"] == motif.slug)
    assert item["jumlah"] == 1


def test_skema_paginasi_katalog_memakai_kunci_indonesia():
    schema = KatalogPagination().get_paginated_response_schema({"type": "array"})
    assert "hasil" in schema["properties"]
    assert "count" not in schema["properties"]
