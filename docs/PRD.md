# PRD — Sistem Toko Batik Mankota (E-Commerce + POS + Back Office)

Versi: 1.0 (draft) · Tanggal: 16 Oktober 2026

---

## 1. Ringkasan

Batik Mankota membutuhkan satu sistem terpadu yang menggabungkan **toko online (e-commerce)** dan **toko fisik (kasir/POS)** dengan **satu sumber data stok**. Setiap penjualan di toko fisik langsung mengurangi stok yang tampil di e-commerce, dan sebaliknya. Sistem juga mencakup persediaan, pengadaan dari supplier, keuangan, dan CRM/member.

### Tujuan
1. Stok online dan offline selalu sinkron (tidak ada oversell).
2. Pelanggan bisa menjelajahi katalog tanpa login, dan didorong login untuk melihat detail lengkap.
3. Kasir bisa transaksi cepat dengan scan QR code produk.
4. Pemilik/admin melihat laporan penjualan, stok, dan keuangan secara real time.
5. Pelanggan setia terkelola lewat program member.

### Di luar cakupan (v1)
- Aplikasi mobile native (cukup web responsif/PWA).
- Marketplace multi-toko / multi-cabang (disiapkan di arsitektur, belum diaktifkan).
- Akuntansi penuh (jurnal umum, neraca). v1 hanya laporan keuangan usaha sederhana.
- Integrasi marketplace pihak ketiga (Tokopedia, Shopee).

---

## 2. Peran Pengguna (Role)

Hanya **3 role**. Pengunjung yang belum login bukan role, hanya status "tamu".

| Role | Siapa | Ringkasan akses |
|---|---|---|
| **Admin** | Pemilik / manajer toko | Akses penuh semua modul, kelola akun kasir, lihat keuangan & laporan |
| **Kasir** | Penjaga toko | POS, scan QR, lihat stok, input pelanggan/member di kasir. Tidak bisa lihat keuangan & harga beli |
| **User** | Pelanggan online | Belanja, keranjang, checkout, riwayat pesanan, profil & poin member |
| *(Tamu)* | Pengunjung tanpa login | Landing page + katalog terbatas |

### Matriks hak akses

| Fitur | Tamu | User | Kasir | Admin |
|---|:--:|:--:|:--:|:--:|
| Landing page & katalog ringkas | ✔ | ✔ | ✔ | ✔ |
| Detail produk lengkap (semua varian, status stok, bahan, panduan ukuran, ulasan) | ✘ | ✔ | ✔ | ✔ |
| Keranjang & checkout | ✘ | ✔ | ✘ | ✘ |
| Riwayat pesanan & poin sendiri | ✘ | ✔ | ✘ | ✘ |
| POS (transaksi offline) | ✘ | ✘ | ✔ | ✔ |
| Scan QR & lihat stok | ✘ | ✘ | ✔ | ✔ |
| Stok opname / penyesuaian stok | ✘ | ✘ | ✘ | ✔ |
| Kelola produk, harga, cetak QR | ✘ | ✘ | ✘ | ✔ |
| Supplier & purchase order | ✘ | ✘ | ✘ | ✔ |
| Keuangan & laporan | ✘ | ✘ | ✘ | ✔ |
| Kelola pelanggan/member | ✘ | ✘ | lihat & daftar | ✔ |
| Kelola akun & role | ✘ | ✘ | ✘ | ✔ |

---

## 3. Alur Utama

### 3.1 Pelanggan online
1. Buka landing page → klik katalog.
2. Lihat kartu produk: foto, nama, kisaran harga, kategori, label motif. **Stok, varian lengkap, bahan, panduan ukuran, ulasan terkunci** dengan ajakan "Masuk untuk melihat detail lengkap".
3. Daftar / login sebagai User.
4. Pilih varian (ukuran/warna) → keranjang → checkout (alamat, ongkir, pembayaran).
5. Stok **direservasi** saat pesanan dibuat; dilepas jika tidak dibayar dalam batas waktu.
6. Pembayaran sukses → stok resmi berkurang → pesanan diproses admin → dikirim.

### 3.2 Pembeli offline (kasir)
1. Kasir scan QR barang (kamera atau scanner USB) → item masuk keranjang kasir.
2. Opsional: cari/daftarkan pelanggan sebagai member (dapat poin).
3. Pilih metode bayar (tunai / QRIS / transfer / debit) → cetak/kirim struk.
4. **Saat transaksi tersimpan, stok langsung berkurang** dan angka di e-commerce ikut berubah.

### 3.3 Pengadaan
1. Admin buat Purchase Order ke supplier.
2. Barang datang → penerimaan barang (goods receipt) → stok bertambah, QR dicetak untuk varian baru.
3. Tagihan supplier tercatat sebagai hutang di keuangan; pelunasan dicatat sebagai pengeluaran.

---

## 4. Kebutuhan Fungsional per Modul

### 4.1 Landing Page & Storefront (publik)
- **F-LP-01** Landing page: hero, koleksi unggulan, produk terbaru, cerita/tentang Batik Mankota, kontak & lokasi toko, CTA daftar/login.
- **F-LP-02** Katalog dengan filter (kategori, motif, rentang harga, ukuran) dan pencarian.
- **F-LP-03** Tamu hanya melihat info ringkas; detail lengkap butuh login (lihat matriks 2).
- **F-LP-04** SEO dasar (judul, meta, URL bersih, sitemap) dan tampilan responsif mobile.
- **F-LP-05** Halaman detail produk tersedia bagi User: varian, status stok (Tersedia / Tinggal sedikit / Habis; angka persis hanya untuk Admin dan Kasir), deskripsi, bahan, perawatan, panduan ukuran, ulasan.

### 4.2 E-Commerce (User)
- **F-EC-01** Registrasi (email + password, verifikasi email), login, lupa password.
- **F-EC-02** Keranjang, wishlist.
- **F-EC-03** Checkout: alamat tersimpan, kalkulasi ongkir, kode voucher, metode bayar.
- **F-EC-04** Pembayaran online via payment gateway (virtual account, QRIS, e-wallet) + opsi ambil di toko.
- **F-EC-05** Status pesanan: menunggu bayar → dibayar → diproses → dikirim → selesai / dibatalkan.
- **F-EC-06** Reservasi stok saat checkout dengan batas waktu (default 1 jam, dapat diatur admin).
- **F-EC-07** Notifikasi email (dan WhatsApp opsional) untuk status pesanan.
- **F-EC-08** Ulasan produk setelah pesanan selesai.

### 4.3 Kasir & Penjualan (POS)
- **F-POS-01** Layar kasir cepat: scan QR/barcode, cari manual, ubah qty, diskon item/total (batas diskon sesuai izin).
- **F-POS-02** Metode bayar: tunai (hitung kembalian), QRIS, transfer, kartu debit; bayar campuran.
- **F-POS-03** Struk (cetak thermal 58/80 mm atau PDF/WhatsApp).
- **F-POS-04** Shift kasir: buka shift (modal awal), tutup shift (rekonsiliasi kas, selisih tercatat).
- **F-POS-05** Tahan transaksi (hold), batalkan, retur/refund (butuh persetujuan admin).
- **F-POS-06** **Stok berkurang otomatis dan atomik saat transaksi POS disimpan**; transaksi ditolak jika stok tersedia tidak cukup.
- **F-POS-07** Cari/daftarkan member di kasir; poin otomatis bertambah.

### 4.4 Persediaan & Stok (Inventory)
- **F-INV-01** Master produk → varian (SKU unik, ukuran, warna), kategori, motif, foto, harga jual, harga beli.
- **F-INV-02** **QR code per varian (SKU)**: dibuat otomatis, dapat dicetak sebagai label (ukuran label dapat dipilih, cetak massal per produk/penerimaan).
- **F-INV-03** Buku stok (stock ledger): semua perubahan stok tercatat (masuk, keluar online, keluar POS, retur, opname, penyesuaian) lengkap dengan siapa, kapan, dan referensi dokumen.
- **F-INV-04** Stok opname: hitung fisik vs sistem, selisih menjadi penyesuaian (butuh admin).
- **F-INV-05** Stok minimum & peringatan stok menipis.
- **F-INV-06** Stok tersedia = stok fisik − stok tereservasi. Itulah angka yang ditampilkan ke User.
- **F-INV-07** Opsional: lokasi rak/gudang.

### 4.5 Pengadaan & Supplier (Procurement)
- **F-PRC-01** Master supplier (kontak, alamat, termin bayar).
- **F-PRC-02** Purchase Order: draft → dikirim → diterima sebagian/penuh → selesai/batal.
- **F-PRC-03** Penerimaan barang menambah stok dan mencatat harga beli aktual (dipakai untuk HPP).
- **F-PRC-04** Hutang supplier, jatuh tempo, pelunasan.
- **F-PRC-05** Riwayat harga beli per supplier.

### 4.6 Keuangan & Pelaporan Usaha
- **F-FIN-01** Pencatatan otomatis dari penjualan (online & POS), pembelian, dan pengeluaran operasional.
- **F-FIN-02** Pengeluaran operasional manual (listrik, gaji, sewa, dll.) dengan kategori.
- **F-FIN-03** Kas & bank: saldo per akun, mutasi, rekonsiliasi shift kasir.
- **F-FIN-04** Piutang/hutang sederhana.
- **F-FIN-05** Laporan: penjualan harian/bulanan per channel (online vs offline), laba kotor (pakai HPP), laba rugi sederhana, arus kas, nilai persediaan, produk terlaris, stok menipis, kinerja kasir.
- **F-FIN-06** Ekspor laporan ke Excel dan PDF.

### 4.7 CRM & Member
- **F-CRM-01** Profil pelanggan terpadu (online dan offline digabung lewat nomor HP/email).
- **F-CRM-02** Tingkatan member (mis. Reguler, Silver, Gold) berdasar total belanja.
- **F-CRM-03** Poin: dapat per belanja, tukar sebagai potongan.
- **F-CRM-04** Riwayat belanja dan preferensi (motif/ukuran favorit).
- **F-CRM-05** Voucher/promo, ulang tahun member.
- **F-CRM-06** Segmentasi sederhana (pelanggan pasif, top spender) dan pengiriman kampanye (email/WhatsApp) — fase lanjut.

### 4.8 Administrasi
- **F-ADM-01** Kelola akun Kasir dan Admin; reset password; nonaktifkan akun.
- **F-ADM-02** Pengaturan toko (nama, alamat, logo, pajak, format struk, batas reservasi, aturan poin).
- **F-ADM-03** Audit log tindakan sensitif (ubah harga, penyesuaian stok, void/retur, ubah role).

> Registry ID admin: `ADM-xx` memetakan kemampuan PRD (F-ADM-xx → ADM-xx), `SEC-xx` untuk kendali keamanan lintas fitur tanpa fitur PRD. `ADM-02` sengaja tidak dipakai; F-ADM-02 (Pengaturan toko) memakai **ADM-31**. 2FA = **SEC-01**, reset 2FA = **SEC-02**.

---

## 5. Aturan Bisnis Penting

1. **Satu sumber kebenaran stok.** Semua perubahan stok lewat satu layanan inventory dan dicatat di stock ledger; tidak ada kode lain yang mengubah angka stok langsung.
2. **Anti-oversell.** Pengurangan stok memakai transaksi database dengan penguncian baris; jika tersedia < diminta, transaksi gagal dengan pesan jelas.
3. **Stok tersedia = fisik − reservasi.** Pesanan online yang belum dibayar menahan stok sementara; kadaluarsa otomatis melepas reservasi.
4. **Prioritas kasir.** Pembelian fisik di tangan pelanggan tidak boleh kalah dengan reservasi online yang belum dibayar; reservasi online yang belum lunas boleh dilepas oleh sistem bila stok fisik tinggal itu saja (aturan dapat dikonfirmasi pemilik).
5. **Harga beli tersembunyi dari kasir dan user.**
6. **Void/retur** mengembalikan stok lewat entri ledger baru, bukan menghapus riwayat.
7. **Data transaksi tidak dihapus**, hanya dibatalkan/di-void (soft delete).
8. Mata uang Rupiah (IDR), bilangan bulat; zona waktu Asia/Jakarta.
9. Setiap SKU punya tepat satu QR code permanen (tidak berubah walau harga berubah).
10. Tamu dan User tidak pernah melihat jumlah stok persis maupun harga beli. Status stok yang tampil: **0 = Habis**, **1–5 = Tinggal sedikit**, **>5 = Tersedia**. Angka stok persis hanya untuk Admin dan Kasir, termasuk di teks galat.

---

## 6. QR Code Produk

- Isi QR: URL pendek `https://<domain>/q/<sku>` (atau token SKU).
- **Di kasir:** scan menghasilkan lookup SKU → tambah ke keranjang POS.
- **Di luar kasir (pelanggan scan):** membuka halaman produk; tamu diarahkan melihat ringkasan dan ajakan login.
- Cetak label: nama, SKU, ukuran, harga, QR; cetak massal dari penerimaan barang atau daftar produk.
- Scan memakai kamera perangkat (web) atau scanner USB/Bluetooth (mode keyboard).

---

## 7. Kebutuhan Non-Fungsional

| Area | Target |
|---|---|
| Kinerja | Halaman katalog < 2 dtk (p95); scan → item masuk keranjang kasir < 500 ms |
| Ketersediaan | 99,5% saat jam toko; backup DB harian + uji pemulihan berkala |
| Keamanan | HTTPS, token di cookie HttpOnly, hash password kuat, 2FA admin, proteksi CSRF/XSS/SQL injection, rate limit login, RBAC di server (API), audit log |
| Privasi | Patuh UU PDP: data pelanggan minimal, dapat diekspor/dihapus atas permintaan |
| Kegunaan | Responsif (HP/tablet/desktop), UI kasir ramah layar sentuh, bahasa Indonesia |
| Integritas data | Transaksi atomik, ledger append-only, idempotensi pada pembayaran & POS |
| Skalabilitas | Cukup untuk ribuan SKU dan ratusan transaksi/hari pada satu server; dapat naik tanpa ubah arsitektur |

---

## 8. Integrasi Eksternal

| Kebutuhan | Opsi |
|---|---|
| Payment gateway | Midtrans atau Xendit |
| Ongkos kirim & resi | Biteship atau RajaOngkir |
| Email transaksional | SMTP / layanan email |
| WhatsApp (opsional) | WhatsApp Business API / penyedia lokal |
| Printer struk | ESC/POS thermal via browser (WebUSB/print dialog) atau PDF |

---

## 9. Roadmap Rilis

| Fase | Isi | Hasil |
|---|---|---|
| **0. Fondasi** | Setup proyek, autentikasi, 3 role, skema dasar | Login & RBAC berjalan |
| **1. Inventory + QR** | Produk, varian, stock ledger, QR & cetak label | Stok terkelola |
| **2. POS** | Kasir, scan, bayar, struk, shift, stok berkurang | Toko fisik beroperasi |
| **3. Storefront + E-commerce** | Landing, katalog, gating login, keranjang, checkout, reservasi stok, pembayaran | Toko online hidup & sinkron |
| **4. Procurement + Keuangan** | Supplier, PO, penerimaan, hutang, laporan | Laba rugi & kas |
| **5. CRM & Member** | Poin, tier, voucher, segmentasi | Retensi pelanggan |
| **6. Penyempurnaan** | Notifikasi WA, retur lanjut, optimasi, PWA | Siap skala |

---

## 10. Metrik Keberhasilan
- Selisih stok sistem vs fisik saat opname < 2%.
- 0 kasus oversell per bulan.
- Waktu rata-rata transaksi kasir < 60 detik per 3 item.
- ≥ 30% pengunjung katalog yang melihat produk mendaftar/login.
- Laporan penjualan bulanan tersedia otomatis tanpa input manual ganda.

---

## 11. Asumsi & Pertanyaan Terbuka
1. Toko tunggal dulu (satu lokasi). Cabang baru → ditunda.
2. Stack teknologi pada `docs/ARSITEKTUR.md`: backend dan frontend terpisah (Django + DRF + PostgreSQL untuk API, Next.js untuk web). Backend dapat diganti NestJS bila tim lebih nyaman.
3. Perlu konfirmasi pemilik: aturan prioritas kasir vs reservasi online (poin 4 bagian 5), batas diskon kasir, nilai poin, dan lama reservasi.
4. Pajak (PPN) dikenakan atau tidak, dan format struk resmi.
5. Apakah pelanggan online bisa ambil di toko (click & collect)? PRD mengasumsikan ya.
6. Apakah perlu kasir bekerja saat internet putus (offline-first)? PRD v1 mengasumsikan **tidak**; jika perlu, masuk fase 6 (PWA + antrean sinkron).
