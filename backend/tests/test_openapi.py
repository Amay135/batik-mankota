import yaml
from rest_framework.test import APIClient

from apps.accounts.admin_scope import ADMIN_CAPABILITIES

FASE_SAAT_INI = 0


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
