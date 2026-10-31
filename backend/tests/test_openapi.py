import time

import pytest
import yaml
from django.test import override_settings
from rest_framework.test import APIClient

from apps.accounts.admin_scope import ADMIN_CAPABILITIES
from apps.accounts.models import User
from apps.accounts.permissions import ADMIN_2FA_AT_SESSION_KEY, ADMIN_2FA_SESSION_KEY

FASE_SAAT_INI = 0


@override_settings(DEBUG=True)
def test_skema_openapi_memuat_fase_0_dan_field_2fa():
    response = APIClient().get("/api/schema/")
    assert response.status_code == 200
    schema = yaml.safe_load(response.content)

    for entry in ADMIN_CAPABILITIES:
        if entry["fase"] > FASE_SAAT_INI:
            continue
        # APIView tanpa queryset: DRF menamai ulang {pk} menjadi {id}.
        path = entry["path"].replace("<int:pk>", "{id}")
        assert path in schema["paths"], entry
        assert entry["method"].lower() in schema["paths"][path], entry

    user_schema = next(
        s
        for s in schema["components"]["schemas"].values()
        if {"role", "totp_enrolled", "totp_verified"} <= set(s.get("properties", {}))
    )
    assert "role" in user_schema["properties"]


@pytest.mark.django_db
@override_settings(DEBUG=False)
def test_skema_hanya_admin_dengan_2fa_saat_bukan_debug():
    admin = User.objects.create_user(
        email="admin-skema@mankota.test",
        password="rahasia-kuat-1",
        nama_lengkap="Admin",
        role=User.Role.ADMIN,
        otp_enabled=True,
    )
    kasir = User.objects.create_user(
        email="kasir-skema@mankota.test",
        password="rahasia-kuat-1",
        nama_lengkap="Kasir",
        role=User.Role.KASIR,
    )

    assert APIClient().get("/api/schema/").status_code == 401

    unverified = APIClient()
    unverified.force_login(admin)
    assert unverified.get("/api/schema/").status_code == 403

    kasir_client = APIClient()
    kasir_client.force_login(kasir)
    assert kasir_client.get("/api/schema/").status_code == 403

    verified = APIClient()
    verified.force_login(admin)
    session = verified.session
    session[ADMIN_2FA_SESSION_KEY] = admin.pk
    session[ADMIN_2FA_AT_SESSION_KEY] = int(time.time())
    session.save()
    assert verified.get("/api/schema/").status_code == 200
