# CLAUDE.md — Batik Mankota (E-Commerce + POS + Back Office)

Panduan untuk Claude Code di repo ini. Baca bersama `docs/PRD.md` (apa yang dibangun) dan `docs/ARSITEKTUR.md` (bagaimana dibangun). Jika ada konflik, `docs/PRD.md` menang untuk perilaku bisnis, `docs/ARSITEKTUR.md` untuk keputusan teknis.

## Ringkasan Proyek

Sistem terpadu toko batik: landing page + e-commerce, kasir (POS), persediaan, pengadaan, keuangan, CRM/member. **Satu database, satu sumber stok.** Penjualan di kasir langsung mengurangi stok yang tampil di e-commerce.

Arsitektur: **monorepo dengan dua aplikasi terpisah**: `backend/` (backend) dan `frontend/` (frontend), berkomunikasi hanya lewat REST API (OpenAPI).

Bahasa UI/produk: **Bahasa Indonesia**. Kode, nama variabel, commit: **bahasa Inggris**. Komentar boleh Indonesia atau Inggris, konsisten per file.

## Stack

- **Backend (`backend/`)**: Python 3.12 · Django 5 · Django REST Framework · drf-spectacular · auth sesi Django + CSRF · PostgreSQL 16 · Celery + Redis · pytest-django.
- **Frontend (`frontend/`)**: Next.js 15 (App Router) · TypeScript · React 19 · Tailwind CSS · shadcn/ui · TanStack Query · React Hook Form + Zod · openapi-typescript · Vitest · Playwright.
- **Infra**: Docker Compose · Nginx/Caddy · Cloudflare · GitHub Actions.

## Struktur

```
backend/
  config/              settings (base/dev/prod), urls, celery
  apps/accounts/       User kustom, role, auth cookie, 2FA
  apps/catalog/        Product, Variant (SKU, QR token)
  apps/inventory/      Stock, StockMovement, reservasi, opname   ← INTI STOK
  apps/pos/            shift, pembayaran offline, struk
  apps/orders/         checkout, pesanan, pembayaran
  apps/procurement/    supplier, PO, penerimaan barang
  apps/finance/        kas/bank, pengeluaran, hutang
  apps/crm/            customer, member, poin, voucher
  apps/reports/        laporan & ekspor
  apps/audit/          audit log
frontend/src/
  app/(publik)/        landing, katalog, produk/[slug], q/[token]
  app/(auth)/          masuk, daftar, verifikasi-2fa
  app/(akun)/          koleksi, produk/[slug], checkout, pesanan   [user]
  app/kasir/           POS (belum dibangun)                          [kasir, admin]
  app/dashboard/       akun, audit, stok, pengadaan, keuangan, laporan, pelanggan  [admin]
  components/ lib/ types/api.d.ts (DIGENERATE, jangan diedit)
docs/                  PRD.md, ARSITEKTUR.md
```

> backend dan frontend = nama folder, service, dan job CI. api.mankota.id = domain; /api/v1/ = path URL. Keduanya bukan nama folder.

Tiap app backend punya: `models.py`, `services.py` (logika bisnis), `selectors.py` (query baca), `serializers.py`, `views.py`, `urls.py`, `tests/`.

## Perintah Umum

```bash
# Infra lokal
docker compose up -d db redis

# Backend (Windows + Anaconda)
conda create -n mankota python=3.12 -y && conda activate mankota
cd backend
pip install -r requirements/dev.txt
cp .env.example .env
python manage.py migrate
python manage.py buat_admin
python manage.py runserver                 # http://localhost:8000
celery -A config worker -l info            # worker
celery -A config beat -l info              # jadwal (kadaluarsa reservasi)
ruff check . && ruff format .
pytest                                     # semua test
pytest apps/inventory -k concurrency       # test konkurensi stok
python manage.py makemigrations --check    # migrasi tidak boleh tertinggal
python manage.py spectacular --file schema.yml   # ekspor OpenAPI

# Frontend (Node 20+)
cd frontend
npm install
cp .env.example .env.local
npm run gen:api        # generate tipe TS dari schema backend
npm run dev            # http://localhost:3000
npm run lint && npm run typecheck && npm test
npm run e2e            # Playwright (alur kasir & checkout)
```

> Test stok/konkurensi **harus di PostgreSQL**, bukan SQLite.

## Role (hanya 3)

`admin`, `kasir`, `user`. Tamu = belum login, **bukan role**. Jangan menambah role baru tanpa persetujuan user.

- Penegakan izin **di backend** (DRF permission class). Menyembunyikan menu di Next.js hanya untuk UX, bukan keamanan.
- Default permission DRF = menolak; tiap view menyatakan izinnya secara eksplisit.
- Akun `kasir`/`admin` hanya dibuat admin. Registrasi publik selalu menghasilkan `user`. Admin wajib 2FA (TOTP).
- Akun `admin` pertama dibuat dengan `python manage.py buat_admin`. Django admin tidak dipasang (melewati 2FA); kelola akun, foto produk, dan data master lewat API/dashboard.
- Kasir tidak boleh melihat `cost_price`, keuangan, atau laporan laba.
- Tiap endpoint punya test izin untuk setiap role (matriks `docs/PRD.md` bagian 2).

## Aturan Wajib: Stok

1. **Jangan pernah** mengubah `Stock.qty_on_hand` / `qty_reserved` langsung (`.save()`, `.update()`, `F()` di luar inventory). Gunakan **hanya** `backend/apps/inventory/services.py`: `reserve`, `release`, `consume`, `add_stock`, `adjust`.
2. Setiap perubahan stok = satu baris `StockMovement` (append-only, tidak di-update/delete).
3. Operasi stok dalam `transaction.atomic()` + `select_for_update()`, urutkan id agar bebas deadlock.
4. Stok tersedia = `qty_on_hand − qty_reserved`.
5. POS: saat transaksi disimpan, stok langsung berkurang (`POS_OUT`); gagal (409) jika tidak cukup.
6. Online: reservasi saat checkout → konsumsi saat pembayaran sukses → lepas saat kadaluarsa/batal.
7. Void/retur = entri ledger baru, bukan menghapus riwayat.
8. Fitur yang menyentuh stok **wajib** punya test, termasuk konkurensi (50 pembeli untuk stok 10 → tepat 10 sukses).
9. Frontend tidak pernah menghitung atau mengubah stok; ia hanya menampilkan hasil API.

## Aturan Wajib: Uang & Transaksi

- Rupiah = **integer** (`BigIntegerField`/`Decimal` 0 desimal). Jangan `float` (backend maupun frontend).
- Snapshot `unit_price` dan `unit_cost` di `OrderItem` saat transaksi.
- Endpoint pembuat order/pembayaran wajib header `Idempotency-Key` (unik).
- Webhook payment: verifikasi signature, idempoten, cek ulang status ke gateway.
- Transaksi tidak di-hard-delete; pakai status `VOID`/`CANCELLED`.
- Zona waktu `Asia/Jakarta`, simpan UTC di DB (`USE_TZ = True`).
- Total, diskon, dan pajak **dihitung di backend**; angka di frontend hanya tampilan.

## Aturan Wajib: Gating Katalog

- Backend memakai serializer bertingkat: `PublicProductCard` (tamu) dan `FullProductDetail` (login).
- Tamu: foto, nama, kisaran harga, kategori, motif. User login: + semua varian, bahan, panduan ukuran, ulasan, **status stok** (Tersedia / Tinggal sedikit / Habis). Angka stok persis hanya admin/kasir. Harga beli tidak pernah keluar ke user/tamu.
- Data terlarang **tidak dikirim** ke tamu (bukan hanya disembunyikan CSS/JS).
- Tombol "Lihat detail lengkap" → `/masuk?next=...`.

## Kontrak API (backend ↔ frontend)

- Basis: `/api/v1/`. Skema OpenAPI dibuat `drf-spectacular`; setiap serializer/view diberi tipe yang jelas.
- Nama route berbahasa Indonesia: sumber daya huruf kecil, tanda hubung bila perlu, tanpa jamak, garis miring di akhir. Contoh: `auth/masuk/`, `katalog/produk/`, `kasir/transaksi/`. Prefiks `auth/` dan `audit/` dipertahankan; prefix modul: `stok/`, `kasir/`, `pengadaan/`, `keuangan/`, `laporan/`, `pelanggan/`, `pembayaran/`.
- Setiap perubahan API → jalankan `npm run gen:api` di `frontend/` dan commit `types/api.d.ts`. CI gagal jika tidak sinkron.
- Jangan menulis tipe respons API manual di frontend; pakai tipe hasil generate.
- Format error: `{"code": "...", "message": "...", "details": {...}}`; frontend menampilkan `message`, logika memakai `code`.
- Perubahan yang merusak kontrak (hapus/ganti field) → naikkan versi atau beri masa transisi.

## Auth & Keamanan

- Auth = **sesi Django**, bukan JWT. Cookie `sessionid` `HttpOnly; Secure; SameSite=Lax` (domain `.mankota.id` lewat `COOKIE_DOMAIN`). Tidak ada access/refresh token; token **tidak** boleh di `localStorage`/`sessionStorage`.
- **CSRF wajib** untuk metode non-GET: `GET /api/v1/auth/csrf/` memasang cookie `csrftoken`, frontend mengirim header `X-CSRFToken`. Fetch dari browser memakai `credentials: "include"`. `CSRF_TRUSTED_ORIGINS` dibaca dari env; produksi wajib mengisi origin https.
- 2FA admin memakai TOTP sendiri (`backend/apps/accounts/totp.py`): 6 digit, langkah 30 detik. Verifikasi terikat sesi dan **diulang setiap login**; batas 12 jam. Jangan memakai `django-otp`/`django-axes`.
- Throttle DRF (cache) 10/menit untuk login, daftar, reset password; 5/menit untuk 2FA; lockout 5 kode salah → kunci 15 menit. Redis **wajib** di produksi agar efektif lintas worker.
- CORS: hanya origin frontend dengan credentials; jangan `*`.
- Server Components meneruskan cookie ke API lewat `cookies()`; halaman terautentikasi `cache: "no-store"`.
- `NEXT_PUBLIC_*` terlihat publik: **jangan isi rahasia**. Rahasia hanya di backend/`.env`.
- Hindari `dangerouslySetInnerHTML`; bila perlu, sanitasi.
- Validasi input di backend (serializer) walau frontend sudah memakai Zod.
- Upload foto: whitelist tipe & ukuran, proses ulang dengan Pillow.
- Jangan log password, token, atau data kartu. Jangan commit `.env`, kunci API, data pelanggan asli.
- Tindakan sensitif (ubah harga, penyesuaian stok, void/retur, ubah role) → `audit_log`.

## QR Code

- `Variant.qr_token` unik dan permanen, dibuat sekali; tidak berubah saat harga/nama berubah.
- Isi QR: `https://<SITE_URL>/q/<qr_token>`. Halaman `frontend /q/[token]`: kasir → tambah ke keranjang POS; user → halaman produk; tamu → ringkasan + ajakan login.
- Layar kasir menerima hasil scan kamera (`html5-qrcode`) **dan** scanner USB (mode keyboard); ekstrak token dari URL atau terima SKU/token mentah.
- Label cetak: nama, SKU, ukuran, harga, QR.

## Konvensi Backend

- Logika bisnis di `services.py`; view DRF tipis; query baca di `selectors.py`; hindari N+1.
- Type hints di service; linter/formatter **ruff**; keamanan `bandit`.
- Nama model/field Inggris; label UI Indonesia lewat `verbose_name`/`gettext`.
- `inventory` tidak boleh mengimpor `pos`/`orders`. `finance` dan `crm` mendengarkan event (`order_paid`, `goods_received`).
- Migrasi: satu perubahan logis per migrasi; jangan edit migrasi yang sudah di-merge.

## Konvensi Frontend

- TypeScript `strict`. Tanpa `any` kecuali dengan alasan di komentar.
- Halaman publik/SEO: Server Components dengan ISR (`revalidate` + tag `catalog`). Interaksi dinamis (kasir, keranjang, dashboard): Client Components + TanStack Query.
- Komponen UI dari shadcn/ui di `components/ui`; komponen fitur di `components/fitur`. Style dengan Tailwind, tanpa CSS inline acak.
- Format Rupiah lewat satu helper (`lib/format.ts`), tanpa float.
- Layar kasir: besar, ramah sentuh, pintasan keyboard, fokus input otomatis untuk scanner.
- Aksesibilitas dasar dan mobile-first untuk landing/katalog; teks UI Bahasa Indonesia.
- `middleware.ts` hanya mengarahkan UX; jangan menganggapnya sebagai penjaga keamanan.

## Pengujian

- Backend: `pytest` + `factory_boy`. Unit test tiap `services.py`; integrasi untuk kasir, checkout, webhook, kadaluarsa reservasi, penerimaan barang; test izin per endpoint × role.
- Frontend: Vitest + Testing Library untuk komponen; Playwright untuk alur: login → lihat katalog (tamu vs user) → checkout; kasir scan → bayar → stok frontend berkurang.
- Jangan menyatakan tugas selesai bila test gagal, migrasi belum konsisten, atau tipe API belum di-generate.

## Commit dan Pull Request

- Jangan menambahkan baris `Co-Authored-By` (Claude/Anthropic), `Claude-Session:`, atau tulisan "Generated with Claude Code" di pesan commit maupun deskripsi PR.
- Pesan commit hanya berisi pesan Conventional Commits.
- Jangan mengubah author atau committer commit; gunakan identitas git milik pengguna.
- Jangan menjalankan `git commit` atau `git push` kecuali diminta pengguna.

## Cara Kerja Claude di Repo Ini

1. Kerjakan per **fase** di `docs/PRD.md` bagian 9; jangan lompat sebelum fase sekarang teruji.
2. Sebelum mengubah skema/aturan stok, uang, auth, atau role: jelaskan rencana singkat dan minta konfirmasi.
3. Perubahan kecil dan terarah; jangan refactor besar tanpa diminta.
4. Fitur lintas lapisan: kerjakan backend (model → service → serializer → view → test) lebih dulu, `gen:api`, lalu frontend.
5. Jalankan `ruff`/`pytest` (backend) dan `lint`/`typecheck`/`test` (frontend) pada bagian yang diubah sebelum menyatakan selesai.
6. Jika persyaratan tidak jelas atau bertentangan dengan PRD, tanyakan; jangan menebak aturan bisnis.
7. Perbarui `docs/PRD.md`/`docs/ARSITEKTUR.md` bila keputusan berubah.
8. Pengguna adalah developer pemula: beri penjelasan singkat mengapa, bukan hanya apa; pilih solusi sederhana dan mudah dirawat.

## Jangan Dilakukan

- Mengubah stok di luar `inventory.services`.
- Menambah role selain `admin`/`kasir`/`user`.
- Menyimpan token di `localStorage` atau menaruh rahasia di `NEXT_PUBLIC_*`.
- Mengandalkan pemeriksaan role di frontend saja.
- Menampilkan harga beli atau stok persis ke tamu/user.
- Memakai `float` untuk uang; menghitung total di frontend untuk disimpan.
- Hard delete transaksi, ledger stok, atau audit log.
- Mengedit `frontend/src/types/api.d.ts` manual.
- Menambah dependensi besar tanpa alasan jelas.

## Pertanyaan Terbuka (konfirmasi pemilik sebelum fase terkait)

- Prioritas kasir vs reservasi online yang belum dibayar.
- Batas diskon kasir, nilai poin, tier member, lama reservasi (default 60 menit).
- PPN dan format struk. Payment gateway final (Midtrans/Xendit), penyedia ongkir.
- Kebutuhan kasir offline-first (default v1: tidak).
- Backend final: Django + DRF (dipakai di dokumen ini) atau NestJS.
