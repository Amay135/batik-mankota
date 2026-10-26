## Ringkasan perubahan

<!-- Jelaskan apa yang berubah dan mengapa. -->

## Tipe perubahan

- [ ] Fitur baru (`feat`)
- [ ] Perbaikan bug (`fix`)
- [ ] Dokumentasi (`docs`)
- [ ] Lainnya: <!-- refactor / test / chore / ci -->

## Checklist

- [ ] Lint lulus (`ruff check .` untuk backend, `npm run lint` untuk frontend)
- [ ] Tes lulus (`pytest` untuk backend, `npm test` untuk frontend)
- [ ] `npm run gen:api` dijalankan dan `types/api.d.ts` ikut di-commit (bila API berubah)
- [ ] Tidak ada perubahan stok di luar `backend/apps/inventory/services.py`
- [ ] Tidak ada rahasia (`.env`, token, kunci API, data pelanggan) di diff
- [ ] Migrasi diperiksa: `python manage.py makemigrations --check` bersih; tidak mengedit migrasi yang sudah di-merge
- [ ] Tidak ada atribusi alat AI (Co-Authored-By/Claude-Session) di commit dan deskripsi PR

## Catatan untuk reviewer

<!-- Hal yang perlu perhatian khusus, keputusan desain, atau pertanyaan. -->
