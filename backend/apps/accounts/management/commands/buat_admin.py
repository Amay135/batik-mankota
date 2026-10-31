from getpass import getpass

from django.contrib.auth import password_validation
from django.core.exceptions import ValidationError
from django.core.management.base import BaseCommand, CommandError
from django.core.validators import validate_email

from apps.accounts.models import User


class Command(BaseCommand):
    help = "Membuat akun admin Mankota (tanpa hak akses Django admin)."

    def handle(self, *args, **options):
        email = input("Email admin: ").strip().lower()
        try:
            validate_email(email)
        except ValidationError:
            raise CommandError("Format email tidak valid.")
        if User.objects.filter(email=email).exists():
            raise CommandError("Email sudah terdaftar.")

        password = getpass("Kata sandi: ")
        if password != getpass("Ulangi kata sandi: "):
            raise CommandError("Kata sandi tidak sama.")
        try:
            password_validation.validate_password(password, user=User(email=email))
        except ValidationError as e:
            raise CommandError(" ".join(e.messages))

        user = User.objects.create_user(email=email, password=password, role=User.Role.ADMIN)
        self.stdout.write(self.style.SUCCESS(f"Admin {user.email} dibuat. Aktifkan 2FA saat login pertama."))
