from rest_framework.throttling import ScopedRateThrottle


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
