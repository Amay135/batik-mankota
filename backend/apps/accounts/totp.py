import base64
import hashlib
import hmac
import secrets
import struct
import time
from urllib.parse import quote, urlencode

STEP = 30
DIGITS = 6
ISSUER = "Batik Mankota"


def generate_secret() -> str:
    return base64.b32encode(secrets.token_bytes(20)).decode().rstrip("=")


def _key(secret: str) -> bytes:
    padded = secret.upper() + "=" * (-len(secret) % 8)
    return base64.b32decode(padded)


def code_at(secret: str, timestamp: float | None = None) -> str:
    counter = int((time.time() if timestamp is None else timestamp) // STEP)
    digest = hmac.new(_key(secret), struct.pack(">Q", counter), hashlib.sha1).digest()
    offset = digest[-1] & 0x0F
    value = struct.unpack(">I", digest[offset : offset + 4])[0] & 0x7FFFFFFF
    return f"{value % 10**DIGITS:0{DIGITS}d}"


def verify(secret: str, code: str, window: int = 1) -> bool:
    code = (code or "").strip()
    if not secret or len(code) != DIGITS or not code.isdigit():
        return False
    now = time.time()
    return any(
        hmac.compare_digest(code_at(secret, now + step * STEP), code)
        for step in range(-window, window + 1)
    )


def provisioning_uri(secret: str, email: str) -> str:
    label = quote(f"{ISSUER}:{email}")
    params = urlencode(
        {
            "secret": secret,
            "issuer": ISSUER,
            "algorithm": "SHA1",
            "digits": DIGITS,
            "period": STEP,
        }
    )
    return f"otpauth://totp/{label}?{params}"
