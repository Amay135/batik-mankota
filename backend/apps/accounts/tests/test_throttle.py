import pytest
from django.core.cache import cache
from rest_framework.test import APIClient

from apps.accounts import totp
from apps.accounts.models import User

PASSWORD = "rahasia-kuat-1"


@pytest.fixture(autouse=True)
def _clear_throttle_cache():
    cache.clear()
    yield
    cache.clear()


def _admin(email):
    return User.objects.create_user(
        email=email,
        password=PASSWORD,
        nama_lengkap="Admin",
        role=User.Role.ADMIN,
        otp_enabled=True,
        otp_secret=totp.generate_secret(),
    )


def _assert_rate_limited(response):
    assert response.status_code == 429
    data = response.json()
    assert data["code"] == "RATE_LIMITED"
    assert "Terlalu banyak" in data["message"]


def test_masuk_dibatasi_dengan_pesan_indonesia(db):
    client = APIClient()
    for _ in range(10):
        response = client.post(
            "/api/v1/auth/masuk/",
            {"email": "tidak-ada@mankota.test", "password": "salah"},
            format="json",
        )
        assert response.status_code == 400

    _assert_rate_limited(
        client.post(
            "/api/v1/auth/masuk/",
            {"email": "tidak-ada@mankota.test", "password": "salah"},
            format="json",
        )
    )


def test_daftar_dibatasi(db):
    client = APIClient()
    for i in range(10):
        response = client.post(
            "/api/v1/auth/daftar/",
            {
                "email": f"pendaftar{i}@mankota.test",
                "password": PASSWORD,
                "nama_lengkap": "Pendaftar",
            },
            format="json",
        )
        assert response.status_code == 201

    _assert_rate_limited(
        client.post(
            "/api/v1/auth/daftar/",
            {
                "email": "pendaftar-akhir@mankota.test",
                "password": PASSWORD,
                "nama_lengkap": "Pendaftar",
            },
            format="json",
        )
    )


def test_reset_password_dibatasi(db):
    actor = _admin("aktor@mankota.test")
    target = _admin("target@mankota.test")

    client = APIClient()
    assert (
        client.post(
            "/api/v1/auth/masuk/",
            {"email": actor.email, "password": PASSWORD},
            format="json",
        ).status_code
        == 200
    )
    assert (
        client.post(
            "/api/v1/auth/2fa/verify/",
            {"code": totp.code_at(actor.otp_secret)},
            format="json",
        ).status_code
        == 200
    )
    cache.clear()  # login/verify tidak ikut memakai kuota reset password

    for _ in range(10):
        response = client.post(
            f"/api/v1/auth/akun/{target.pk}/reset-password/",
            {"password": "sandi-aman-9876"},
            format="json",
        )
        assert response.status_code == 204

    _assert_rate_limited(
        client.post(
            f"/api/v1/auth/akun/{target.pk}/reset-password/",
            {"password": "sandi-aman-9876"},
            format="json",
        )
    )
