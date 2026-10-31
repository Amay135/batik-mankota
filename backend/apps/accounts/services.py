import time

from django.contrib.auth import login
from django.contrib.sessions.models import Session
from django.core.cache import cache
from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import APIException, ValidationError

from apps.audit.models import AuditLog
from apps.audit.services import catat

from . import totp
from .models import User
from .permissions import ADMIN_2FA_AT_SESSION_KEY, ADMIN_2FA_SESSION_KEY

BATAS_GAGAL_2FA = 5
KUNCI_2FA_DETIK = 15 * 60


class TotpAlreadyEnrolled(APIException):
    status_code = 409
    default_detail = {
        "code": "TOTP_ALREADY_ENROLLED",
        "message": "2FA sudah aktif untuk akun ini.",
    }
    default_code = "totp_already_enrolled"


class TotpLocked(APIException):
    status_code = 429
    default_detail = {
        "code": "TOTP_LOCKED",
        "message": "Terlalu banyak kode salah. Coba lagi nanti.",
    }
    default_code = "totp_locked"


def client_ip(request):
    return request.META.get("REMOTE_ADDR") or None


def masuk(request, user):
    login(request, user, backend="django.contrib.auth.backends.ModelBackend")
    request.session.pop(ADMIN_2FA_SESSION_KEY, None)
    request.session.pop(ADMIN_2FA_AT_SESSION_KEY, None)
    if user.role == User.Role.ADMIN:
        catat(
            actor=user,
            action=AuditLog.Action.ADMIN_LOGIN,
            entity="User",
            entity_id=user.pk,
            ip=client_ip(request),
        )


def buat_akun(data):
    return User.objects.create_user(**data)


def ubah_akun(actor, akun, data, ip=None):
    if akun.pk == actor.pk:
        if "role" in data and data["role"] != akun.role:
            raise ValidationError(
                {"role": "Anda tidak dapat mengubah role akun sendiri."}
            )
        if data.get("is_active") is False:
            raise ValidationError(
                {"is_active": "Anda tidak dapat menonaktifkan akun sendiri."}
            )

    with transaction.atomic():
        role_lama = akun.role
        for field, value in data.items():
            setattr(akun, field, value)
        akun.save()
        if akun.role != role_lama:
            catat(
                actor=actor,
                action=AuditLog.Action.ROLE_CHANGE,
                entity="User",
                entity_id=akun.pk,
                before={"role": role_lama},
                after={"role": akun.role},
                ip=ip,
            )
    return akun


def reset_password(akun, password):
    akun.set_password(password)
    akun.save(update_fields=["password"])


def mulai_2fa(user):
    if user.otp_enabled:
        raise TotpAlreadyEnrolled()
    if not user.otp_secret:
        user.otp_secret = totp.generate_secret()
        user.save(update_fields=["otp_secret"])
    return user.otp_secret


def _kunci_gagal(user):
    return f"2fa-gagal:{user.pk}"


def _kunci_lock(user):
    return f"2fa-lock:{user.pk}"


def _cabut_sesi(user):
    # shortcut: iterasi sesi aktif; ganti bila jumlah sesi besar.
    for sesi in Session.objects.filter(expire_date__gte=timezone.now()):
        if sesi.get_decoded().get("_auth_user_id") == str(user.pk):
            sesi.delete()


def reset_2fa(actor, akun, ip=None):
    if akun.pk == actor.pk:
        raise ValidationError("Anda tidak dapat me-reset 2FA akun sendiri.")
    with transaction.atomic():
        sebelum = {"otp_enabled": akun.otp_enabled}
        akun.otp_secret = ""
        akun.otp_enabled = False
        akun.save(update_fields=["otp_secret", "otp_enabled"])
        _cabut_sesi(akun)
        cache.delete_many([_kunci_gagal(akun), _kunci_lock(akun)])
        catat(
            actor=actor,
            action=AuditLog.Action.OTP_RESET,
            entity="User",
            entity_id=akun.pk,
            before=sebelum,
            after={"otp_enabled": False},
            ip=ip,
        )
    return akun


def periksa_kode_2fa(user, code):
    """Verifikasi TOTP + hitung gagal. Lockout memakai cache karena django-axes
    belum dipakai di proyek ini."""
    if cache.get(_kunci_lock(user)):
        raise TotpLocked()
    if totp.verify(user.otp_secret, code):
        cache.delete(_kunci_gagal(user))
        return True
    gagal = cache.get(_kunci_gagal(user), 0) + 1
    cache.set(_kunci_gagal(user), gagal, KUNCI_2FA_DETIK)
    if gagal >= BATAS_GAGAL_2FA:
        cache.set(_kunci_lock(user), True, KUNCI_2FA_DETIK)
    return False


def verifikasi_2fa(request):
    user = request.user
    user.otp_enabled = True
    user.save(update_fields=["otp_enabled"])
    request.session[ADMIN_2FA_SESSION_KEY] = user.pk
    request.session[ADMIN_2FA_AT_SESSION_KEY] = int(time.time())
