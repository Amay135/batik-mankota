import importlib
import sys

import dotenv

_MODULES = ("config.settings.base", "config.settings.dev", "config.settings.prod")


def _import_fresh(name, monkeypatch, origins):
    """Impor ulang settings tanpa pengaruh .env lokal.

    load_dotenv dinonaktifkan agar hasilnya hanya ditentukan env dari test.
    """
    if origins is None:
        monkeypatch.delenv("CSRF_TRUSTED_ORIGINS", raising=False)
    else:
        monkeypatch.setenv("CSRF_TRUSTED_ORIGINS", origins)
    monkeypatch.setattr(dotenv, "load_dotenv", lambda *args, **kwargs: None)
    for module in _MODULES:
        sys.modules.pop(module, None)
    try:
        return importlib.import_module(name)
    finally:
        for module in _MODULES:
            sys.modules.pop(module, None)


def test_dev_trusts_both_local_frontend_origins(monkeypatch):
    dev = _import_fresh("config.settings.dev", monkeypatch, None)
    assert {"http://localhost:3000", "http://127.0.0.1:3000"} <= set(
        dev.CSRF_TRUSTED_ORIGINS
    )


def test_prod_trusted_origins_have_no_default_wildcard_or_http(monkeypatch):
    assert (
        _import_fresh("config.settings.prod", monkeypatch, None).CSRF_TRUSTED_ORIGINS
        == []
    )

    prod = _import_fresh("config.settings.prod", monkeypatch, "https://mankota.id")
    assert prod.CSRF_TRUSTED_ORIGINS == ["https://mankota.id"]
    assert not any(
        "*" in origin or origin.startswith("http://")
        for origin in prod.CSRF_TRUSTED_ORIGINS
    )
