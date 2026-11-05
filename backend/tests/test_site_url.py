from pathlib import Path

from django.conf import settings


def test_site_url_terdokumentasi():
    backend = Path(settings.BASE_DIR)
    assert "SITE_URL=" in (backend / ".env.example").read_text(encoding="utf-8")

    arsitektur = (backend.parent / "docs" / "ARSITEKTUR.md").read_text(encoding="utf-8")
    assert "`SITE_URL`" in arsitektur
    assert "wajib https di produksi" in arsitektur
