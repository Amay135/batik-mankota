# Batik Mankota

Sistem terpadu toko batik: toko online, kasir (POS), persediaan, pengadaan,
keuangan, dan CRM dalam satu sumber data stok.

Repo ini berisi dua aplikasi terpisah yang berkomunikasi lewat REST API:

- `backend/` — backend (Django, Django REST Framework)
- `frontend/` — frontend (Next.js, TypeScript)

## Prasyarat

- Python 3.12
- Node.js 20+
- Docker Desktop (untuk PostgreSQL dan Redis lokal)
- Git

## Struktur

```
backend/  backend Django: config/, apps/, requirements/, tests/
frontend/ frontend Next.js: src/app, src/components, src/lib, src/types, e2e/
docs/     catatan proyek
scripts/  skrip bantu
```

## Menjalankan saat development

1. Aktifkan hook commit (sekali setelah clone):

   ```bash
   bash scripts/setup-hooks.sh
   ```

2. Nyalakan database dan cache:

   ```bash
   docker compose up -d db redis
   ```

3. Backend:

   ```bash
   cd backend
   python -m venv .venv
   source .venv/Scripts/activate   # Git Bash di Windows
   pip install -r requirements/dev.txt
   cp .env.example .env
   python manage.py migrate
   python manage.py runserver
   ```

   API tersedia di http://localhost:8000.

4. Frontend:

   ```bash
   cd frontend
   npm install
   cp .env.example .env.local
   npm run dev
   ```

   Web tersedia di http://localhost:3000.

File `.env` bersifat lokal dan tidak boleh di-commit. Gunakan `.env.example`
sebagai daftar variabel yang diperlukan.

## Kontribusi

Alur kerja (cabang, Pull Request, format commit), cara menjalankan lint dan tes,
aturan migrasi Django, aturan kontrak API, dan larangan commit rahasia ada di
[CONTRIBUTING.md](CONTRIBUTING.md).

Dokumen proyek: [CLAUDE.md](CLAUDE.md), [PRD](docs/PRD.md), [Arsitektur](docs/ARSITEKTUR.md).
