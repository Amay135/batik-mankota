"""Data contoh: 48 produk, kategori, voucher, dan akun demo dengan keranjang berisi 2 item."""
import random

from django.core.management.base import BaseCommand
from django.db import transaction

from apps.accounts.models import User
from apps.catalog.models import FotoProduk, Kategori, Produk, Varian
from apps.orders.models import ItemKeranjang, Keranjang, Voucher

KATEGORI = [
    ("batik-pria", "Batik Pria", "Pria", 18),
    ("batik-wanita", "Batik Wanita", "Wanita", 16),
    ("kain-batik", "Kain Batik", "Kain", 9),
    ("aksesoris", "Aksesoris", "Aksesoris", 5),
]
MOTIF = {
    "parang": ("Parang", "Parang: semangat yang tak putus.",
               "Garis yang mengalir melambangkan kekuatan dan keberanian. Satu motif pengingat untuk terus melangkah dengan percaya diri."),
    "kawung": ("Kawung", "Kawung: kesempurnaan yang bersahaja.",
               "Empat lingkaran yang bertemu pada satu titik melambangkan keadilan, kebijaksanaan, dan pengendalian diri."),
    "truntum": ("Truntum", "Truntum: cinta yang bersemi kembali.",
                "Taburan bintang kecil melambangkan cinta yang tulus, tumbuh pelan, dan tak lekang oleh waktu."),
    "sekar-jagad": ("Sekar Jagad", "Sekar Jagad: indah dalam keberagaman.",
                    "Peta bunga dunia: setiap bentuk berbeda, namun menyatu dalam satu kain yang utuh."),
    "mega-mendung": ("Mega Mendung", "Mega Mendung: tenang di tengah gelisah.",
                     "Awan yang berarak menandakan hati yang sejuk, sabar, dan lapang."),
}
WARNA = {"indigo": ("Indigo", "ID"), "soga": ("Soga", "SG"), "krem": ("Krem", "KR"), "hitam": ("Hitam", "HT")}
BENTUK = {  # slug: (nama, prefix SKU, harga dasar, ukuran?)
    "kemeja": ("Kemeja", "KM", 300000, True),
    "outer": ("Outer", "OT", 420000, True),
    "blus": ("Blus", "BS", 380000, True),
    "dress": ("Dress", "DR", 520000, True),
    "rok": ("Rok", "RK", 330000, True),
    "kain": ("Kain", "KN", 560000, False),
    "selendang": ("Selendang", "SL", 240000, False),
    "pouch": ("Pouch", "PC", 150000, False),
}
KOLEKSI = ["Kaya Nusantara", "Senja Surakarta", "Laweyan Klasik"]
PERAJIN = [f"Perajin Laweyan {i:02d}" for i in range(1, 25)]  # 24 perajin
TEKNIK_HARGA = {"cap": 1.0, "kombinasi": 1.35, "tulis": 1.9}

# 6 produk pertama persis seperti desain (nama, kategori, bentuk, motif, warna, teknik, harga, unggulan)
UTAMA = [
    ("Kemeja Parang Indigo", "batik-pria", "kemeja", "parang", "indigo", "cap", 365000),
    ("Blus Kawung Soga", "batik-wanita", "blus", "kawung", "soga", "cap", 425000),
    ("Kain Sekar Jagad", "kain-batik", "kain", "sekar-jagad", "krem", "tulis", 650000),
    ("Kemeja Truntum Soga", "batik-pria", "kemeja", "truntum", "soga", "cap", 365000),
    ("Dress Sekar Senja", "batik-wanita", "dress", "sekar-jagad", "soga", "cap", 575000),
    ("Selendang Mega Mendung", "aksesoris", "selendang", "mega-mendung", "indigo", "cap", 285000),
]
KATEGORI_BENTUK = {
    "batik-pria": ["kemeja", "outer"],
    "batik-wanita": ["blus", "dress", "rok"],
    "kain-batik": ["kain"],
    "aksesoris": ["selendang", "pouch"],
}


def slugify(s):
    return s.lower().replace(" ", "-")


def rancang_produk(rng):
    hasil = list(UTAMA)
    jumlah = {slug: 0 for slug, *_ in KATEGORI}
    for p in UTAMA:
        jumlah[p[1]] += 1
    target = {slug: n for slug, _, _, n in KATEGORI}
    dipakai = {p[0] for p in hasil}
    for slug, _, _, n in KATEGORI:
        kombinasi = [
            (b, m, w)
            for b in KATEGORI_BENTUK[slug] for m in MOTIF for w in WARNA
        ]
        rng.shuffle(kombinasi)
        for b, m, w in kombinasi:
            if jumlah[slug] >= target[slug]:
                break
            nama = f"{BENTUK[b][0]} {MOTIF[m][0]} {WARNA[w][0]}"
            if nama in dipakai:
                continue
            teknik = rng.choice(["cap", "cap", "tulis", "kombinasi"])
            harga = round(BENTUK[b][2] * TEKNIK_HARGA[teknik] * rng.uniform(0.9, 1.15) / 5000) * 5000
            hasil.append((nama, slug, b, m, w, teknik, min(max(harga, 150000), 1500000)))
            dipakai.add(nama)
            jumlah[slug] += 1
    # Batas rentang harga seperti desain: Rp150.000 - Rp1.500.000
    for i, p in enumerate(hasil):
        if p[0] == "Pouch" or (p[2] == "pouch" and not any(h[6] == 150000 for h in hasil)):
            hasil[i] = (*p[:6], 150000)
    kain_tulis = [i for i, p in enumerate(hasil) if p[2] == "kain" and i >= len(UTAMA)]
    if kain_tulis:
        p = hasil[kain_tulis[0]]
        hasil[kain_tulis[0]] = (*p[:5], "tulis", 1500000)
    return hasil


class Command(BaseCommand):
    help = "Isi database dengan data contoh marketplace Batik Mankota"

    @transaction.atomic
    def handle(self, *args, **opts):
        rng = random.Random(42)
        kategori = {}
        for urutan, (slug, nama, label, _) in enumerate(KATEGORI):
            kategori[slug], _ = Kategori.objects.update_or_create(
                slug=slug, defaults={"nama": nama, "label_pendek": label, "urutan": urutan}
            )

        seq = {}
        rancangan = rancang_produk(rng)
        for idx, (nama, kslug, bentuk, motif, warna, teknik, harga) in enumerate(rancangan):
            prefix = BENTUK[bentuk][1]
            seq[prefix] = seq.get(prefix, 0) + 1
            nomor = seq[prefix]
            punya_ukuran = BENTUK[bentuk][3]
            teknik_nama = {"cap": "cap", "tulis": "tulis", "kombinasi": "kombinasi tulis dan cap"}[teknik]
            if idx == 0:
                rating, ulasan, terjual = 4.9, 48, 126
            else:
                rating, ulasan = round(rng.uniform(4.6, 5.0), 1), rng.randint(6, 40)
                terjual = max(5, 120 - idx * 2 - rng.randint(0, 3))
            produk, _ = Produk.objects.update_or_create(
                slug=slugify(nama),
                defaults=dict(
                    nama=nama, kategori=kategori[kslug], teknik=teknik, motif=motif, bentuk=bentuk,
                    warna_utama=warna, koleksi=KOLEKSI[idx % len(KOLEKSI)], perajin=PERAJIN[idx % len(PERAJIN)],
                    deskripsi=(
                        "Motif klasik, karakter modern. Kemeja batik cap berbahan katun prima yang lembut, "
                        "dengan potongan regular fit untuk kenyamanan sepanjang hari."
                        if idx == 0 else
                        f"{BENTUK[bentuk][0]} batik {teknik_nama} bermotif {MOTIF[motif][0]}, dikerjakan perajin "
                        "Laweyan dengan bahan katun prima yang adem dan nyaman dipakai."
                    ),
                    bahan_detail=(
                        f"100% katun prima · Teknik batik {teknik_nama} · "
                        + ("Lengan panjang · Kancing klasik · " if bentuk in ("kemeja", "outer") else "")
                        + "Dibuat di Laweyan, Surakarta."
                    ),
                    perawatan=(
                        "Cuci terpisah dengan detergen lembut. Jangan digosok keras atau diperas. "
                        "Jemur di tempat teduh agar warna tetap awet."
                    ),
                    cerita_judul=MOTIF[motif][1], cerita_isi=MOTIF[motif][2],
                    harga=harga, rating=rating, jumlah_ulasan=ulasan, terjual=terjual,
                    unggulan=idx < 6 or idx % 7 == 0, aktif=True,
                ),
            )
            produk.varian.all().delete()
            produk.foto.all().delete()
            warna_list = [warna] + [w for w in WARNA if w != warna][: (2 if idx % 3 == 0 else 1)]
            for w in warna_list:
                for u in (["S", "M", "L", "XL", "XXL"] if punya_ukuran else ["ALL"]):
                    stok = rng.choice([0, 3, 8, 12, 20, 30])
                    if idx == 0 and w == "indigo" and u == "L":
                        stok = 24
                    sku = f"{prefix}-{nomor:03d}-{WARNA[w][1]}" + (f"-{u}" if punya_ukuran else "")
                    Varian.objects.create(produk=produk, warna=w, ukuran=u, sku=sku, stok=stok)
            for urutan, jenis in enumerate(["depan", "detail", "belakang", "model"]):
                FotoProduk.objects.create(produk=produk, jenis=jenis, urutan=urutan)

        for kode, tipe, nilai, maks, minimal in [
            ("SELAMATDATANG", "persen", 10, 50000, 200000),
            ("HEMAT25", "nominal", 25000, 0, 300000),
        ]:
            Voucher.objects.update_or_create(
                kode=kode, defaults=dict(tipe=tipe, nilai=nilai, maks_diskon=maks, min_belanja=minimal, aktif=True)
            )

        user, dibuat = User.objects.get_or_create(
            email="rina.wulandari@email.com",
            defaults={"nama_lengkap": "Rina Wulandari", "whatsapp": "0812 8690 1234"},
        )
        if dibuat:
            user.set_password("mankota123")
            user.save()
        k, _ = Keranjang.objects.get_or_create(user=user)
        k.item.all().delete()
        for sku in ("KM-001-ID-L", "BS-001-SG-M"):
            v = Varian.objects.filter(sku=sku).first()
            if v:
                ItemKeranjang.objects.create(keranjang=k, varian=v, jumlah=1)

        self.stdout.write(self.style.SUCCESS(
            f"Selesai: {Produk.objects.count()} produk. Akun demo: rina.wulandari@email.com / mankota123"
        ))
