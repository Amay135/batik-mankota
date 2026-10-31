import pytest
from django.core.management import call_command
from django.core.management.base import CommandError

from apps.accounts.models import User

PASSWORD = "rahasia-kuat-1"


def _jawab(monkeypatch, email, password=PASSWORD):
    monkeypatch.setattr("builtins.input", lambda *_: email)
    sandi = iter([password, password])
    monkeypatch.setattr("apps.accounts.management.commands.buat_admin.getpass", lambda *_: next(sandi))


@pytest.mark.django_db
def test_buat_admin_tanpa_hak_django(monkeypatch):
    _jawab(monkeypatch, "admin-baru@mankota.test")
    call_command("buat_admin")
    u = User.objects.get(email="admin-baru@mankota.test")
    assert u.role == User.Role.ADMIN
    assert u.is_staff is False and u.is_superuser is False and u.otp_enabled is False
    assert u.check_password(PASSWORD)


@pytest.mark.django_db
def test_buat_admin_tolak_sandi_lemah(monkeypatch):
    _jawab(monkeypatch, "lemah@mankota.test", password="123")
    with pytest.raises(CommandError):
        call_command("buat_admin")
    assert not User.objects.filter(email="lemah@mankota.test").exists()


@pytest.mark.django_db
def test_buat_admin_tolak_email_duplikat(monkeypatch):
    User.objects.create_user(email="ada@mankota.test", password=PASSWORD)
    _jawab(monkeypatch, "ada@mankota.test")
    with pytest.raises(CommandError):
        call_command("buat_admin")
