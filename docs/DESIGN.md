# DESIGN.md - Landing Page Batik Mankota

Spesifikasi desain landing page (homepage) toko batik online **Mankota**.
Dibuat dari screenshot Figma. Nilai warna, ukuran, dan teks adalah **estimasi visual** dari gambar beresolusi kecil. Cocokkan lagi dengan Figma asli (hex, font, spacing) sebelum dipakai final.

---

## 1. Kesan Umum

- Mood: hangat, elegan, editorial, bernuansa heritage / budaya.
- Layout: single-page, satu kolom panjang, konten dibatasi container tengah, banyak whitespace.
- Gaya visual: background krem, aksen maroon, foto lifestyle / model / pengrajin dengan warna hangat, sudut kartu sedikit membulat.
- Gaya bahasa: Indonesia, puitis dan singkat (headline kalimat pendek berpola "X yang Y.").

---

## 2. Design Tokens

### Warna (estimasi)

| Token | Nilai kira-kira | Pemakaian |
|---|---|---|
| `--color-bg` | `#F4ECDF` | Background utama (krem) |
| `--color-bg-alt` | `#EBDFCB` | Section selang-seling, kartu split |
| `--color-surface` | `#FFFFFF` | Kartu testimoni, input |
| `--color-primary` | `#7B1E2B` | Tombol utama, announcement bar, banner CTA, footer aksen |
| `--color-primary-dark` | `#5E1520` | Hover tombol utama |
| `--color-text` | `#2B1D16` | Teks utama (cokelat gelap) |
| `--color-text-muted` | `#6E5E52` | Paragraf, caption |
| `--color-border` | `#DCCDB6` | Garis pemisah, outline tombol sekunder |
| `--color-star` | `#C9962B` | Bintang rating |

### Tipografi (estimasi)

| Peran | Font | Catatan |
|---|---|---|
| Display / heading | Serif elegan (mirip Cormorant Garamond / Playfair) | Heading H1 dan H2, bisa ada kata miring |
| Body / UI | Sans-serif bersih (mirip Inter / DM Sans) | Paragraf, nav, tombol, caption |

| Level | Ukuran desktop | Berat |
|---|---|---|
| H1 hero | 56-64px | Regular/Medium, line-height 1.1 |
| H2 section | 36-44px | Regular, line-height 1.15 |
| H3 kartu | 18-22px | Medium |
| Body | 15-16px | Regular, line-height 1.6 |
| Eyebrow | 11-12px | Uppercase, letter-spacing lebar |
| Caption / harga | 13-14px | Regular/Medium |

### Spacing, radius, bayangan

- Container: max-width sekitar 1200px, padding horizontal 24-32px.
- Jarak antar section: 80-112px vertikal.
- Grid gap: 20-24px.
- Radius: kartu 8-12px, gambar 8px, tombol 4-6px (atau pill, cek di Figma).
- Bayangan: sangat halus / hampir tidak ada; pemisah pakai border tipis.

### Tombol

- **Primary**: background maroon, teks krem/putih, padding 12x24px.
- **Secondary**: transparan, border tipis, teks gelap.
- **Link teks**: dengan panah atau underline, dipakai di kanan heading section ("Lihat semua").

---

## 3. Struktur Halaman (urut dari atas)

### 3.1 Announcement Bar
- Strip tipis full-width, background maroon.
- Satu baris teks kecil di tengah (info promo / pengiriman).

### 3.2 Navbar
- Kiri: logo "Mankota" (wordmark serif, ada tagline kecil).
- Tengah: 4-5 link menu (Beranda, Koleksi, Tentang, dst.).
- Kanan: ikon search, wishlist/akun, keranjang.
- Background krem, border bawah tipis.

### 3.3 Hero
- Layout 2 kolom: teks kiri, foto kanan.
- Kiri:
  - Eyebrow kecil uppercase.
  - H1: **"Warisan yang hidup dalam setiap langkah."**
  - Paragraf pendek deskripsi brand.
  - 2 tombol: primary (belanja/lihat koleksi) + secondary (cerita kami).
  - Baris rating: 5 bintang + teks kecil (jumlah pelanggan / ulasan).
- Kanan:
  - Foto pasangan memakai batik serasi, latar bangunan tradisional / pendopo.
  - Kartu mengambang kecil di pojok foto (nama produk + harga / tombol cepat).

### 3.4 Kategori - "Beragam rupa, satu warisan."
- Eyebrow + H2 di kiri, link teks kecil di kanan.
- 3 kartu gambar besar sejajar (rasio sekitar 4:5):
  - Foto pria berbatik biru.
  - Foto wanita berbatik.
  - Foto kain motif batik (close-up).
- Di bawah tiap gambar: nama kategori + sub-keterangan singkat.

### 3.5 Produk Pilihan - "Pilihan yang selalu berkesan."
- Header: eyebrow, H2, link "Lihat semua" di kanan.
- Grid 4 kolom kartu produk:
  - Gambar produk (kemeja batik, rasio sekitar 3:4, background netral).
  - Nama produk.
  - Harga.
- Warna produk bervariasi: navy, cokelat, motif ramai, putih-biru.

### 3.6 Cerita / Split Section
- 2 kolom: foto kiri (pengrajin sedang membatik dengan canting), kartu teks kanan (background krem gelap).
- Kartu teks:
  - H2: **"Setiap motif punya asal. Setiap batik punya jiwa."**
  - Paragraf cerita.
  - Baris 3 angka statistik (angka besar + label kecil), contoh: jumlah pengrajin, motif, tahun berdiri.
  - Tombol (mis. "Baca ceritanya").

### 3.7 Proses - "Bukan sekadar polos. Sebuah proses."
- Heading tengah / kiri.
- 3 kolom langkah, tiap kolom: nomor / ikon kecil, judul langkah, deskripsi 1-2 kalimat.
  - Contoh alur: Desain motif -> Dikerjakan tangan -> Proses akhir / dikemas.
- Di bawahnya baris 3 badge kepercayaan (ikon + teks pendek), mis. pengiriman, jaminan keaslian, garansi / retur.

### 3.8 Testimoni - "Batik yang menemani banyak cerita."
- H2 di tengah.
- 3 kartu putih sejajar:
  - 5 bintang.
  - Kutipan 2-4 baris.
  - Nama + keterangan (kota / pembeli).

### 3.9 Banner CTA
- Blok lebar, background maroon, radius membulat.
- Kiri: H2 putih **"Ada batik untuk setiap versi diri Anda."** + tombol (terang).
- Kanan: foto kain batik close-up yang menyatu dengan banner (overlay gradien maroon dari kiri).

### 3.10 Newsletter
- Satu baris: teks **"Jadilah bagian dari cerita Mankota."** di kiri, input email + tombol subscribe di kanan.

### 3.11 Footer
- Kolom 1: logo + deskripsi singkat + (opsional) ikon sosial.
- 3 kolom link (Belanja, Perusahaan/Tentang, Bantuan).
- Bar bawah: copyright dan link legal kecil.
- Background krem gelap / maroon gelap sesuai Figma.

---

## 4. Komponen Reusable

| Komponen | Props / isi |
|---|---|
| `SectionHeader` | `eyebrow`, `title`, `actionLabel`, `actionHref` |
| `Button` | `variant: primary / secondary / link`, `size` |
| `CategoryCard` | `image`, `title`, `subtitle`, `href` |
| `ProductCard` | `image`, `name`, `price`, `href` |
| `StatItem` | `value`, `label` |
| `ProcessStep` | `number`, `title`, `description` |
| `TrustBadge` | `icon`, `text` |
| `TestimonialCard` | `rating`, `quote`, `name`, `meta` |
| `NewsletterForm` | `email`, `onSubmit` |

---

## 5. Responsif (usulan)

| Breakpoint | Perilaku |
|---|---|
| >= 1024px | Layout seperti desain (hero 2 kolom, grid produk 4 kolom) |
| 640-1023px | Hero jadi 1 kolom (foto di bawah teks), produk 2 kolom, kategori 2-3 kolom, testimoni 2 kolom |
| < 640px | Semua 1 kolom, navbar jadi hamburger, produk 2 kolom kecil, banner CTA ditumpuk (gambar di atas/bawah teks) |

---

## 6. Interaksi (usulan)

- Hover kartu produk / kategori: gambar zoom halus (scale 1.03), judul berubah warna maroon.
- Hover tombol primary: gelapkan ke `--color-primary-dark`.
- Navbar sticky dengan background krem + border tipis saat scroll.
- Input newsletter: validasi email, state error/sukses di bawah field.

---

## 7. Aset yang Dibutuhkan

- Foto hero (pasangan berbatik).
- 3 foto kategori (pria, wanita, kain).
- 4+ foto produk (kemeja batik, background polos).
- Foto pengrajin membatik.
- Foto close-up kain batik (banner CTA).
- Logo Mankota (SVG), ikon (search, cart, user, pengiriman, jaminan, retur).

---

## 8. Catatan / Perlu Dicek di Figma

- Hex warna dan font pasti.
- Teks asli di announcement bar, menu navbar, nama produk, harga, angka statistik, dan isi testimoni (di screenshot terlalu kecil untuk dibaca akurat).
- Apakah kartu hero mengambang punya aksi (tombol) atau hanya info.
- Nilai radius dan spacing yang tepat.
