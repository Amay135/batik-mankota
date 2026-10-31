import time
from datetime import timedelta

import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.accounts.permissions import ADMIN_2FA_AT_SESSION_KEY, ADMIN_2FA_SESSION_KEY
from apps.audit.models import AuditLog

PASSWORD = "rahasia-kuat-1"


@pytest.fixture
def admin(db):
    return User.objects.create_user(
        email="admin@mankota.test",
        password=PASSWORD,
        nama_lengkap="Admin",
        role=User.Role.ADMIN,
        otp_enabled=True,
    )


@pytest.fixture
def kasir(db):
    return User.objects.create_user(
        email="kasir@mankota.test",
        password=PASSWORD,
        nama_lengkap="Kasir",
        role=User.Role.KASIR,
    )


@pytest.fixture
def client_admin(admin):
    client = APIClient()
    client.force_login(admin)
    session = client.session
    session[ADMIN_2FA_SESSION_KEY] = admin.pk
    session[ADMIN_2FA_AT_SESSION_KEY] = int(time.time())
    session.save()
    return client


@pytest.fixture
def logs(admin, kasir):
    AuditLog.objects.create(actor=admin, action=AuditLog.Action.ROLE_CHANGE)
    AuditLog.objects.create(actor=kasir, action=AuditLog.Action.ADMIN_LOGIN)
    AuditLog.objects.create(actor=admin, action=AuditLog.Action.ROLE_CHANGE)


def _get(client, **params):
    return client.get("/api/v1/audit/", params)


def test_filter_aksi(client_admin, logs):
    data = _get(client_admin, aksi="role_change").json()

    assert data["count"] == 2
    assert {baris["action"] for baris in data["results"]} == {"role_change"}


def test_filter_pelaku_tanpa_kapital(client_admin, logs):
    data = _get(client_admin, pelaku="KASIR@").json()

    assert data["count"] == 1
    assert data["results"][0]["actor_email"] == "kasir@mankota.test"


def test_filter_tanggal(client_admin, logs):
    hari_ini = timezone.localdate()
    besok = (hari_ini + timedelta(days=1)).isoformat()
    kemarin = (hari_ini - timedelta(days=1)).isoformat()

    assert _get(client_admin, dari=hari_ini.isoformat()).json()["count"] == 3
    assert _get(client_admin, sampai=hari_ini.isoformat()).json()["count"] == 3
    assert _get(client_admin, dari=besok).json()["count"] == 0
    assert _get(client_admin, sampai=kemarin).json()["count"] == 0


def test_filter_digabung(client_admin, logs):
    data = _get(client_admin, aksi="role_change", pelaku="admin@mankota.test").json()

    assert data["count"] == 2


def test_filter_tidak_valid_400(client_admin):
    assert _get(client_admin, dari="bukan-tanggal").status_code == 400
    assert _get(client_admin, aksi="aksi-asing").status_code == 400
