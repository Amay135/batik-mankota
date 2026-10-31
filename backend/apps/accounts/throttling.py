from rest_framework.exceptions import APIException
from rest_framework.throttling import ScopedRateThrottle


class RateLimited(APIException):
    status_code = 429
    default_detail = {
        "code": "RATE_LIMITED",
        "message": "Terlalu banyak percobaan. Coba lagi beberapa saat.",
    }
    default_code = "rate_limited"


class IpScopedRateThrottle(ScopedRateThrottle):
    """Batas per IP; ScopedRateThrottle bawaan memakai pk akun untuk request login."""

    cache_format = "throttle_ip_%(scope)s_%(ident)s"

    def get_cache_key(self, request, view):
        if self.scope is None:
            return None
        return self.cache_format % {
            "scope": self.scope,
            "ident": self.get_ident(request),
        }


class AuthRateThrottle(IpScopedRateThrottle):
    """Scope auth per IP, termasuk endpoint terautentikasi seperti reset password.

    DRF memanggil throttled() milik view, bukan throttle, jadi 429 Indonesia
    dilempar dari sini.
    """

    def allow_request(self, request, view):
        if super().allow_request(request, view):
            return True
        raise RateLimited()
