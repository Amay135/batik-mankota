# Marketplace Batik Mankota

Cakupan: katalog online, detail produk, keranjang, checkout, riwayat pesanan. POS, persediaan, pengadaan, keuangan, dan CRM belum dikerjakan.

## Autentikasi

Sesi Django (cookie `sessionid`, httpOnly) + CSRF (`csrftoken`, header `X-CSRFToken`). Semua endpoint marketplace memakai `IsAuthenticated`; hanya `auth/csrf`, `auth/daftar`, `auth/masuk` yang terbuka. Percobaan masuk/daftar dibatasi 20 per menit.

Gerbang di frontend ada dua lapis: `middleware.ts` (cek cookie) dan layout `(akun)` (validasi sesi ke API).

## Endpoint (`/api/v1/`)

| Method | Path | Keterangan |
| --- | --- | --- |
| GET | `auth/csrf/` | pasang cookie CSRF |
| POST | `auth/daftar/`, `auth/masuk/`, `auth/keluar/` | |
| GET/PATCH | `auth/saya/` | profil |
| GET | `katalog/kategori/` | kategori + jumlah produk |
| GET | `katalog/produk/` | filter: `kategori`, `q`, `harga_min`, `harga_maks`, `teknik`, `ukuran`, `warna` (boleh berulang), `urut` (`populer`, `terbaru`, `harga-terendah`, `harga-tertinggi`), `page`, `per_halaman` |
| GET | `katalog/produk/<slug>/` | detail, varian, foto, produk terkait |
| GET | `keranjang/` | isi keranjang + ringkasan harga |
| POST | `keranjang/item/` | `{varian_id, jumlah}` |
| PATCH/DELETE | `keranjang/item/<id>/` | ubah jumlah / hapus |
| POST/DELETE | `keranjang/voucher/` | `{kode}` / lepas |
| GET/POST | `pesanan/` | riwayat / buat pesanan dari keranjang |
| GET | `pesanan/<nomor>/` | detail (hanya milik sendiri) |

## Aturan bisnis

- Ongkir flat Rp25.000; gratis bila subtotal >= Rp750.000 (`GRATIS_ONGKIR_MIN`, `ONGKIR_FLAT` di `settings/base.py`).
- Voucher: persen atau nominal, ada minimal belanja dan batas diskon. Contoh: `SELAMATDATANG`, `HEMAT25`.
- Stok dikunci (`select_for_update`) saat pesanan dibuat, jadi dua checkout bersamaan tidak bisa oversell. Stok berkurang saat pesanan dibuat; pembatalan/kedaluwarsa belum mengembalikan stok.
- Batas bayar 24 jam. Nomor virtual account saat ini simulasi; ganti dengan respons Midtrans/Xendit saat gateway dipasang (`orders/services.py::buat_pesanan`).
- Item pesanan menyimpan snapshot nama, harga, SKU.

## Gambar produk

Model `FotoProduk.gambar` opsional. Jika kosong, frontend menggambar ilustrasi motif (`components/ui/seni-produk.tsx`). Unggah foto asli lewat Django admin dan ilustrasi otomatis diganti.

## Belum ada

Halaman Cerita Kami dan Panduan Batik, favorit (tombol hati baru visual), ulasan, poin loyalitas (teks di checkout hanya tampilan), dropdown kota/kecamatan dari data wilayah, webhook pembayaran.
