from django.contrib.auth import authenticate, password_validation
from rest_framework import serializers

from . import services
from .models import User
from .permissions import ADMIN_2FA_SESSION_KEY


class UserSerializer(serializers.ModelSerializer):
    totp_enrolled = serializers.BooleanField(source="otp_enabled", read_only=True)
    totp_verified = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "nama_lengkap",
            "whatsapp",
            "role",
            "totp_enrolled",
            "totp_verified",
        ]
        read_only_fields = ["id", "role", "totp_enrolled", "totp_verified"]

    def get_totp_verified(self, obj) -> bool:
        request = self.context.get("request")
        return bool(request and request.session.get(ADMIN_2FA_SESSION_KEY) == obj.pk)


class AkunAdminSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "nama_lengkap",
            "whatsapp",
            "role",
            "is_active",
            "otp_enabled",
        ]
        read_only_fields = fields


class BuatAkunSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=8)
    nama_lengkap = serializers.CharField(max_length=120)
    whatsapp = serializers.CharField(max_length=20, required=False, allow_blank=True)
    role = serializers.ChoiceField(choices=[User.Role.ADMIN, User.Role.KASIR])

    def validate_email(self, value):
        value = value.lower()
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("Email ini sudah terdaftar.")
        return value

    def validate(self, attrs):
        calon = User(email=attrs["email"], nama_lengkap=attrs["nama_lengkap"])
        password_validation.validate_password(attrs["password"], user=calon)
        return attrs


class UbahAkunSerializer(serializers.ModelSerializer):
    role = serializers.ChoiceField(
        choices=[User.Role.ADMIN, User.Role.KASIR], required=False
    )

    class Meta:
        model = User
        fields = ["nama_lengkap", "whatsapp", "role", "is_active"]


class ResetPasswordSerializer(serializers.Serializer):
    password = serializers.CharField(write_only=True, min_length=8)

    def validate_password(self, value):
        password_validation.validate_password(value, user=self.context.get("user"))
        return value


class OtpVerifySerializer(serializers.Serializer):
    code = serializers.CharField(max_length=6)

    def validate_code(self, value):
        if not services.periksa_kode_2fa(self.context["user"], value):
            raise serializers.ValidationError("Kode 2FA salah atau sudah kedaluwarsa.")
        return value


class RegisterSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=8)
    nama_lengkap = serializers.CharField(max_length=120)
    whatsapp = serializers.CharField(max_length=20, required=False, allow_blank=True)

    def validate_email(self, value):
        value = value.lower()
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("Email ini sudah terdaftar.")
        return value

    def validate(self, attrs):
        password_validation.validate_password(attrs["password"])
        return attrs

    def create(self, data):
        return User.objects.create_user(**data)


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        user = authenticate(
            request=self.context.get("request"),
            username=attrs["email"].lower(),
            password=attrs["password"],
        )
        if not user or not user.is_active:
            raise serializers.ValidationError("Email atau kata sandi salah.")
        attrs["user"] = user
        return attrs
