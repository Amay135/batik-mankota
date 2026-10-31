import pytest
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.catalog.models import Varian
from apps.catalog.serializers import status_stok

ALAMAT = {
    "nama_lengkap": "Rina Wulandari", "whatsapp": "0812 8690 1234", "email": "rina@email.com",
    "alamat": "Jl. Komang Raya No. 18", "provinsi": "DKI Jakarta", "kota": "Jakarta Selatan",
    "kecamatan": "Mampang Prapatan", "kode_pos": "12730", "metode_bayar": "transfer_bank", "bank": "bca",
}


def test_marketplace_wajib_login(seeded):
    c = APIClient()
    for url in ("/api/v1/katalog/produk/", "/api/v1/katalog/kategori/", "/api/v1/keranjang/", "/api/v1/auth/saya/"):
        assert c.get(url).status_code in (401, 403)


def test_login_dan_daftar(seeded):
    c = APIClient()
    assert c.post("/api/v1/auth/masuk/", {"email": "rina.wulandari@email.com", "password": "salah"}).status_code == 400
    r = c.post("/api/v1/auth/daftar/", {"email": "baru@email.com", "password": "rahasia-kuat-1", "nama_lengkap": "Baru"})
    assert r.status_code == 201
    assert c.get("/api/v1/auth/saya/").json()["email"] == "baru@email.com"


def test_katalog_sesuai_desain(client_login):
    r = client_login.get("/api/v1/katalog/produk/").json()
    assert r["jumlah"] == 48 and len(r["hasil"]) == 6 and r["total_halaman"] == 8
    assert [p["nama"] for p in r["hasil"]] == [
        "Kemeja Parang Indigo", "Blus Kawung Soga", "Kain Sekar Jagad",
        "Kemeja Truntum Soga", "Dress Sekar Senja", "Selendang Mega Mendung",
    ]
    assert r["hasil"][0]["label"] == "Pria · Batik cap"
    assert r["meta"]["harga_min"] == 150000 and r["meta"]["harga_maks"] == 1500000
    assert r["meta"]["total_perajin"] == 24
    kat = [(k["slug"], k["jumlah"]) for k in client_login.get("/api/v1/katalog/kategori/").json()["kategori"]]
    assert kat == [("batik-pria", 18), ("batik-wanita", 16), ("kain-batik", 9), ("aksesoris", 5)]


def test_filter(client_login):
    r = client_login.get("/api/v1/katalog/produk/?kategori=kain-batik").json()
    assert r["jumlah"] == 9
    r = client_login.get("/api/v1/katalog/produk/?teknik=tulis&ukuran=L").json()
    assert all(p["teknik"] == "tulis" for p in r["hasil"])
    r = client_login.get("/api/v1/katalog/produk/?harga_min=300000&harga_maks=400000&urut=harga-terendah").json()
    hargas = [p["harga"] for p in r["hasil"]]
    assert hargas == sorted(hargas) and all(300000 <= h <= 400000 for h in hargas)
    assert client_login.get("/api/v1/katalog/produk/?q=parang").json()["jumlah"] >= 1


def test_detail(client_login):
    d = client_login.get("/api/v1/katalog/produk/kemeja-parang-indigo/").json()
    assert d["harga"] == 365000 and len(d["terkait"]) == 4 and d["tersedia"]
    v = next(v for v in d["varian"] if v["sku"] == "KM-001-ID-L")
    assert "stok" not in v and v["status_stok"] == "Tersedia"


def test_stok_angka_hanya_admin_dan_kasir(seeded):
    for role in ("admin", "kasir"):
        u = User.objects.create_user(
            email=f"{role}@mankota.test", password="rahasia-kuat-1", nama_lengkap=role, role=role
        )
        c = APIClient()
        assert c.login(username=u.email, password="rahasia-kuat-1")
        d = c.get("/api/v1/katalog/produk/kemeja-parang-indigo/").json()
        v = next(v for v in d["varian"] if v["sku"] == "KM-001-ID-L")
        assert v["stok"] == 24 and "status_stok" not in v


def test_ambang_status_stok():
    assert [status_stok(n) for n in (0, 1, 5, 6)] == [
        "Habis", "Tinggal sedikit", "Tinggal sedikit", "Tersedia",
    ]


def test_keranjang_demo_sama_dengan_desain(client_login):
    r = client_login.get("/api/v1/keranjang/").json()
    assert r["ringkasan"]["subtotal"] == 790000 and r["ringkasan"]["promo_ongkir"] == 25000
    assert r["ringkasan"]["jumlah_produk"] == 2
    assert all("stok" not in item["varian"] for item in r["item"])


def test_checkout_mengurangi_stok_dan_kosongkan_keranjang(client_login):
    v = Varian.objects.get(sku="KM-001-ID-L")
    stok = v.stok
    r = client_login.post("/api/v1/pesanan/", ALAMAT, format="json")
    assert r.status_code == 201, r.content
    d = r.json()
    assert d["status"] == "menunggu_pembayaran" and d["nomor_va"] and len(d["item"]) == 2
    v.refresh_from_db()
    assert v.stok == stok - 1
    assert client_login.get("/api/v1/keranjang/").json()["item"] == []
    assert client_login.get(f"/api/v1/pesanan/{d['nomor']}/").status_code == 200


def test_pesanan_milik_orang_lain_tidak_bisa_dibuka(client_login):
    nomor = client_login.post("/api/v1/pesanan/", ALAMAT, format="json").json()["nomor"]
    c2 = APIClient()
    c2.post("/api/v1/auth/daftar/", {"email": "lain@email.com", "password": "rahasia-kuat-1", "nama_lengkap": "Lain"})
    assert c2.get(f"/api/v1/pesanan/{nomor}/").status_code == 404


def test_tidak_bisa_melebihi_stok(client_login):
    v = Varian.objects.get(sku="KM-001-ID-L")
    r = client_login.post("/api/v1/keranjang/item/", {"varian_id": v.id, "jumlah": 999}, format="json")
    assert r.status_code == 400
    # PRD F-LP-05/5.10: user hanya melihat status, bukan angka stok — termasuk di teks galat.
    assert str(v.stok) not in r.content.decode()


def test_voucher(client_login):
    assert client_login.post("/api/v1/keranjang/voucher/", {"kode": "NGAWUR"}, format="json").status_code == 400
    r = client_login.post("/api/v1/keranjang/voucher/", {"kode": "selamatdatang"}, format="json").json()
    assert r["ringkasan"]["diskon_voucher"] > 0
