# Panduan Kontribusi

Terima kasih sudah ikut mengembangkan Batik Mankota. Dokumen ini berisi aturan
kerja yang wajib diikuti semua kontributor.

**Baca [CLAUDE.md](CLAUDE.md) sebelum berkontribusi.** Dokumen itu memuat aturan
inti proyek (stok, uang, role, keamanan, kontrak API). Perubahan pada aturan inti
harus lewat Pull Request dan disetujui pemilik repo. Claude Code setiap anggota
otomatis membaca `CLAUDE.md`, sehingga semua orang bekerja dengan aturan yang
sama.

## Alur kerja

1. **Clone** repo (atau fork lalu clone fork sendiri bila tidak punya akses tulis):

   ```bash
   git clone https://github.com/<organisasi>/mankota.git
   cd mankota
   ```

2. **Buat cabang** dari `main`. Jangan bekerja langsung di `main`.

   ```bash
   git switch main
   git pull --rebase
   git switch -c feat/nama-fitur     # fitur baru
   git switch -c fix/nama-bug        # perbaikan bug
   git switch -c docs/nama-dokumen   # dokumentasi
   ```

3. **Kerjakan perubahan kecil dan terarah.** Satu cabang = satu tujuan.

4. **Push** cabang dan buka **Pull Request ke `main`**. Isi template PR dengan
   lengkap.

5. **Minimal 1 review** dari kontributor lain sebelum merge. Perubahan yang
   membalikkan aturan stok, uang, auth, atau role butuh review tambahan dari
   pemilik area terkait (lihat `.github/CODEOWNERS`).

6. Setelah disetujui, merge (squash atau rebase sesuai kebiasaan repo). Hapus
   cabang setelah merge.

## Format commit

Gunakan [Conventional Commits](https://www.conventionalcommits.org/):

```
<tipe>(<cakupan opsional>): <ringkasan singkat>

<body opsional>
```

Tipe yang dipakai: `feat`, `fix`, `docs`, `test`, `refactor`, `chore`, `ci`,
`perf`.

Contoh:

```
feat(inventory): tambah service adjust stok
fix(pos): cegah pembayaran ganda dengan Idempotency-Key
docs: perbarui panduan kontribusi
chore: naikkan versi ruff
```

Ringkasan dalam bahasa Inggris, huruf kecil, tanpa titik di akhir.

## Atribusi commit

Agar akun alat AI tidak muncul sebagai contributor, commit dan deskripsi PR
tidak boleh memuat atribusi alat AI (`Co-Authored-By` dari Claude/Anthropic,
`Claude-Session:`, atau "Generated with Claude Code").

1. **Aktifkan hook sekali setelah clone:**

   ```bash
   bash scripts/setup-hooks.sh
   ```

   Hook ini menghapus baris atribusi alat AI dari pesan commit secara otomatis.
   Pengaturan Claude Code di `.claude/settings.json` juga sudah mematikan
   atribusi untuk semua anggota.

2. **Jangan menaruh `Co-Authored-By` dari alat AI di commit atau deskripsi PR.**
   CI memeriksa semua commit di PR dan riwayat yang di-push; PR yang memuatnya
   akan gagal.

3. **Memperbaiki commit yang terlanjur memuat atribusi:**

   - Commit terakhir: `git commit --amend` — hapus baris atribusi, simpan.
   - Beberapa commit: `git rebase -i <commit-sebelumnya>`, tandai `reword`,
     lalu hapus barisnya di setiap pesan commit.

## Menjalankan lint dan tes

### Backend

```bash
cd backend
conda activate mankota            # atau aktifkan venv
ruff check . && ruff format --check .
pytest
python manage.py makemigrations --check
```

Test stok dan konkurensi wajib berjalan di PostgreSQL, bukan SQLite.

### Frontend

```bash
cd frontend
npm run lint
npm run typecheck
npm test
```

Alur end-to-end (opsional sebelum rilis): `npm run e2e`.

Kedua sisi harus hijau sebelum PR diminta review.

## Aturan migrasi Django

- **Selalu `git pull --rebase` sebelum membuat migrasi baru**, supaya nomor
  migrasi tidak bentrok dengan cabang lain.
- Satu perubahan logis = satu migrasi. Jangan menggabungkan beberapa perubahan
  skema yang tidak berhubungan.
- **Jangan mengedit migrasi yang sudah di-merge.** Kalau ada kesalahan, buat
  migrasi baru untuk memperbaikinya.
- Sertakan file migrasi di PR. CI gagal bila ada perubahan model tanpa migrasi.

## Aturan kontrak API

- Setiap perubahan API (serializer, view, field respons) wajib diikuti:

  ```bash
  cd frontend
  npm run gen:api
  ```

- Commit hasil generate `frontend/src/types/api.d.ts` bersama perubahan
  backend. CI gagal jika tipe tidak sinkron.
- Jangan mengedit `api.d.ts` manual dan jangan menulis tipe respons API manual
  di kode frontend.
- Perubahan yang menghapus atau mengganti field wajib menaikkan versi API atau
  memberi masa transisi.

## Rahasia

- Jangan commit `.env`, kunci API, token, password, atau data pelanggan asli.
- `.env.example` hanya berisi nama variabel dan nilai contoh, tanpa rahasia.
- Jangan menaruh rahasia di variabel `NEXT_PUBLIC_*` — nilainya terlihat publik.
- Jika rahasia tidak sengaja ter-commit, segera rotasi kuncinya dan beri tahu
  pemilik repo.

## Aturan lain yang tidak boleh dilanggar

- Jangan mengubah stok di luar `backend/apps/inventory/services.py`.
- Jangan menambah role selain `admin`, `kasir`, `user`.
- Jangan menggunakan `float` untuk uang.
- Jangan menghapus transaksi, ledger stok, atau audit log.
