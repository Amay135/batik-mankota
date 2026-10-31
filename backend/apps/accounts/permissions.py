import time

from django.conf import settings
from rest_framework.exceptions import APIException
from rest_framework.permissions import BasePermission

# Nilai = pk admin yang sudah lolos TOTP di sesi ini, bukan boolean. Django
# mempertahankan isi sesi saat login(), jadi pk mencegah flag basi ikut terbawa.
ADMIN_2FA_SESSION_KEY = "admin_2fa_user_id"
ADMIN_2FA_AT_SESSION_KEY = "admin_2fa_at"
BATAS_VERIFIKASI_2FA_DETIK = 12 * 60 * 60


class GuestNotAllowed(APIException):
    """401 untuk tamu.

    SessionAuthentication.authenticate_header() bernilai None, sehingga DRF
    mengubah AuthenticationFailed menjadi 403. Exception biasa ini tidak diubah.
    """

    status_code = 401
    default_detail = "Autentikasi diperlukan."
    default_code = "not_authenticated"
    auth_header = "Session"


def _require_authenticated(request):
    if not request.user or not request.user.is_authenticated:
        raise GuestNotAllowed()


def _admin_verified(request):
    if not request.user.otp_enabled:
        return False
    if request.session.get(ADMIN_2FA_SESSION_KEY) != request.user.pk:
        return False
    verified_at = request.session.get(ADMIN_2FA_AT_SESSION_KEY)
    if not verified_at or time.time() - verified_at > BATAS_VERIFIKASI_2FA_DETIK:
        request.session.pop(ADMIN_2FA_SESSION_KEY, None)
        request.session.pop(ADMIN_2FA_AT_SESSION_KEY, None)
        return False
    return True


class IsUser(BasePermission):
    message = "Hanya pelanggan yang dapat mengakses fitur ini."

    def has_permission(self, request, view):
        _require_authenticated(request)
        return request.user.role == "user"


class IsAdminBootstrap(BasePermission):
    """Role admin saja. Hanya untuk setup/verify 2FA, jangan dipakai endpoint admin lain."""

    message = "Hanya admin yang dapat mengakses fitur ini."

    def has_permission(self, request, view):
        _require_authenticated(request)
        return request.user.role == "admin"


class IsAdmin(IsAdminBootstrap):
    message = "Hanya admin dengan 2FA terverifikasi yang dapat mengakses fitur ini."

    def has_permission(self, request, view):
        return super().has_permission(request, view) and _admin_verified(request)


class IsKasirOrAdmin(BasePermission):
    message = "Hanya kasir atau admin yang dapat mengakses fitur ini."

    def has_permission(self, request, view):
        _require_authenticated(request)
        if request.user.role == "kasir":
            return True
        return request.user.role == "admin" and _admin_verified(request)


class SchemaPermission(BasePermission):
    """Terbuka saat DEBUG (pengembangan); selain itu admin dengan 2FA terverifikasi."""

    def has_permission(self, request, view):
        return settings.DEBUG or IsAdmin().has_permission(request, view)
