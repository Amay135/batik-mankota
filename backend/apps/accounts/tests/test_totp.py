import base64
import re
import time
from urllib.parse import parse_qs, unquote, urlparse

import pyotp
from django.core.cache import cache
from rest_framework.test import APIClient

from apps.accounts import services, totp
from apps.accounts.models import User

PASSWORD = "rahasia-kuat-1"
SECRET = "JBSWY3DPEHPK3PXP"
# 12 karakter hex (sisa generator lama): 0/1 bukan alfabet base32.
# Data dummy: sengaja bukan secret Base32 yang valid.
INVALID_SECRET = "not-a-valid-base32-secret!"
# RFC 6238 SHA1: secret ASCII "12345678901234567890", vektor 8 digit.
RFC_SECRET = base64.b32encode(b"12345678901234567890").decode().rstrip("=")
RFC_VECTORS = {
    59: 94287082,
    1111111109: 7081804,
    1111111111: 14050471,
    1234567890: 89005924,
    2000000000: 69279037,
}


def test_generate_secret_base32_tanpa_padding():
    secret = totp.generate_secret()
    assert re.fullmatch(r"[A-Z2-7]{32}", secret)


def test_provisioning_uri_sesuai_spesifikasi():
    email = "admin+batik@mankota.id"
    uri = totp.provisioning_uri(SECRET, email)

    parsed = urlparse(uri)
    assert parsed.scheme == "otpauth"
    assert parsed.netloc == "totp"
    assert unquote(parsed.path.lstrip("/")) == f"Batik Mankota:{email}"
    # Spasi di issuer harus %20 (RFC 3986), bukan + (form encoding).
    assert "issuer=Batik%20Mankota" in uri
    assert "issuer=Batik+Mankota" not in uri

    params = parse_qs(parsed.query, strict_parsing=True)
    assert params == {
        "secret": [SECRET],
        "issuer": ["Batik Mankota"],
        "algorithm": ["SHA1"],
        "digits": ["6"],
        "period": ["30"],
    }
    assert re.fullmatch(r"[A-Z2-7]+", params["secret"][0])


def test_code_sama_dengan_rfc6238():
    for timestamp, expected in RFC_VECTORS.items():
        assert totp.code_at(RFC_SECRET, timestamp) == f"{expected % 10**6:06d}"
        assert totp.code_at(RFC_SECRET, timestamp) == pyotp.TOTP(RFC_SECRET).at(
            timestamp
        )


def test_verify_menerima_kode_pyotp(monkeypatch):
    now = 1_700_000_000
    monkeypatch.setattr(totp.time, "time", lambda: now)
    valid = {pyotp.TOTP(SECRET).at(now + d) for d in (-30, 0, 30)}

    assert totp.verify(SECRET, pyotp.TOTP(SECRET).at(now))
    assert totp.verify(SECRET, pyotp.TOTP(SECRET).at(now - 30))
    salah = next(f"{i:06d}" for i in range(10**6) if f"{i:06d}" not in valid)
    assert not totp.verify(SECRET, salah)


def test_verify_menolak_secret_tidak_valid_tanpa_error():
    # Data lama non-base32 dulu membuat verify melempar binascii.Error (500).
    assert totp.is_valid_secret(INVALID_SECRET) is False
    assert totp.is_valid_secret(SECRET) is True
    assert totp.is_valid_secret("") is False
    assert totp.verify(INVALID_SECRET, "123456") is False


def test_verify_menolak_kode_di_luar_jendela(monkeypatch):
    now = 1_700_000_000
    monkeypatch.setattr(totp.time, "time", lambda: now)
    assert totp.verify(SECRET, totp.code_at(SECRET, now - 2 * totp.STEP)) is False
    assert totp.verify(SECRET, totp.code_at(SECRET, now + 2 * totp.STEP)) is False


def test_secret_dua_admin_tidak_saling_terverifikasi(monkeypatch):
    now = 1_700_000_000
    monkeypatch.setattr(totp.time, "time", lambda: now)
    secret_a, secret_b = totp.generate_secret(), totp.generate_secret()
    assert secret_a != secret_b
    assert totp.verify(secret_a, totp.code_at(secret_a, now))
    assert totp.verify(secret_b, totp.code_at(secret_b, now))
    assert totp.verify(secret_a, totp.code_at(secret_b, now)) is False
    assert totp.verify(secret_b, totp.code_at(secret_a, now)) is False


def test_mulai_2fa_secret_stabil_dan_mengganti_secret_lama(db):
    user = User.objects.create_user(
        email="admin-stabil@mankota.test",
        password=PASSWORD,
        nama_lengkap="Admin Stabil",
        role=User.Role.ADMIN,
        otp_secret=INVALID_SECRET,
    )
    secret = services.mulai_2fa(user)
    assert secret != INVALID_SECRET
    assert totp.is_valid_secret(secret)
    # Refresh/panggilan ulang tidak boleh mengganti secret yang sudah valid.
    assert services.mulai_2fa(user) == secret


def test_api_verify_menerima_kode_pyotp(db):
    cache.clear()
    user = User.objects.create_user(
        email="admin-totp@mankota.test",
        password=PASSWORD,
        nama_lengkap="Admin TOTP",
        role=User.Role.ADMIN,
    )
    client = APIClient()
    masuk = client.post(
        "/api/v1/auth/masuk/",
        {"email": user.email, "password": PASSWORD},
        format="json",
    )
    assert masuk.status_code == 200, masuk.content

    setup = client.post("/api/v1/auth/2fa/setup/", {}, format="json")
    assert setup.status_code == 200, setup.content
    secret = setup.json()["secret"]

    # Aplikasi autentikator membaca secret dari QR (otpauth_uri), bukan field
    # "secret" terpisah; keduanya wajib menunjuk secret yang sama.
    app = pyotp.parse_uri(setup.json()["otpauth_uri"])
    assert app.secret == secret

    now = int(time.time())
    valid = {pyotp.TOTP(secret).at(now + d) for d in (-30, 0, 30)}
    salah = next(f"{i:06d}" for i in range(10**6) if f"{i:06d}" not in valid)
    ditolak = client.post("/api/v1/auth/2fa/verify/", {"code": salah}, format="json")
    assert ditolak.status_code == 400

    diterima = client.post(
        "/api/v1/auth/2fa/verify/",
        {"code": app.now()},
        format="json",
    )
    assert diterima.status_code == 200, diterima.content
    user.refresh_from_db()
    assert user.otp_enabled is True


def test_api_setup_mengganti_secret_lama_tidak_valid(db):
    cache.clear()
    user = User.objects.create_user(
        email="admin-lama@mankota.test",
        password=PASSWORD,
        nama_lengkap="Admin Lama",
        role=User.Role.ADMIN,
        otp_secret=INVALID_SECRET,
    )
    client = APIClient()
    assert (
        client.post(
            "/api/v1/auth/masuk/",
            {"email": user.email, "password": PASSWORD},
            format="json",
        ).status_code
        == 200
    )

    setup = client.post("/api/v1/auth/2fa/setup/", {}, format="json")
    assert setup.status_code == 200, setup.content
    secret = setup.json()["secret"]
    assert secret != INVALID_SECRET
    user.refresh_from_db()
    assert user.otp_secret == secret

    # Alur nyata: QR -> aplikasi -> OTP -> backend.
    app = pyotp.parse_uri(setup.json()["otpauth_uri"])
    assert app.secret == secret
    diterima = client.post(
        "/api/v1/auth/2fa/verify/", {"code": app.now()}, format="json"
    )
    assert diterima.status_code == 200, diterima.content
    user.refresh_from_db()
    assert user.otp_enabled is True
