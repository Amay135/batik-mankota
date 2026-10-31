from django.contrib.auth import logout
from django.middleware.csrf import get_token
from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from . import services, totp
from .models import User
from .permissions import IsAdmin, IsAdminBootstrap
from .serializers import (
    AkunAdminSerializer,
    BuatAkunSerializer,
    LoginSerializer,
    OtpVerifySerializer,
    RegisterSerializer,
    ResetPasswordSerializer,
    UbahAkunSerializer,
    UserSerializer,
)
from .throttling import AuthRateThrottle, IpScopedRateThrottle


class CsrfView(APIView):
    """Memasang cookie csrftoken; dipanggil frontend sebelum request POST pertama."""

    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        return Response({"csrf": get_token(request)})


class RegisterView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [AuthRateThrottle]
    throttle_scope = "auth"

    def post(self, request):
        s = RegisterSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        user = s.save()
        services.masuk(request, user)
        return Response(
            UserSerializer(user, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class LoginView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [AuthRateThrottle]
    throttle_scope = "auth"

    def post(self, request):
        s = LoginSerializer(data=request.data, context={"request": request})
        s.is_valid(raise_exception=True)
        user = s.validated_data["user"]
        services.masuk(request, user)
        return Response(UserSerializer(user, context={"request": request}).data)


class LogoutView(APIView):
    def post(self, request):
        logout(request)
        return Response(status=status.HTTP_204_NO_CONTENT)


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(responses=UserSerializer)
    def get(self, request):
        return Response(UserSerializer(request.user, context={"request": request}).data)

    @extend_schema(request=UserSerializer, responses=UserSerializer)
    def patch(self, request):
        s = UserSerializer(
            request.user, data=request.data, partial=True, context={"request": request}
        )
        s.is_valid(raise_exception=True)
        s.save()
        return Response(s.data)


def _akun_staff(pk):
    return get_object_or_404(User, pk=pk, role__in=[User.Role.ADMIN, User.Role.KASIR])


def _akun_admin(pk):
    return get_object_or_404(User, pk=pk, role=User.Role.ADMIN)


class AkunListView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        qs = User.objects.filter(role__in=[User.Role.ADMIN, User.Role.KASIR]).order_by(
            "email"
        )
        return Response(AkunAdminSerializer(qs, many=True).data)

    def post(self, request):
        s = BuatAkunSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        akun = services.buat_akun(s.validated_data)
        return Response(AkunAdminSerializer(akun).data, status=status.HTTP_201_CREATED)


class AkunDetailView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request, pk):
        return Response(AkunAdminSerializer(_akun_staff(pk)).data)

    def patch(self, request, pk):
        akun = _akun_staff(pk)
        s = UbahAkunSerializer(akun, data=request.data, partial=True)
        s.is_valid(raise_exception=True)
        akun = services.ubah_akun(
            request.user, akun, s.validated_data, ip=services.client_ip(request)
        )
        return Response(AkunAdminSerializer(akun).data)


class ResetPasswordView(APIView):
    permission_classes = [IsAdmin]
    throttle_classes = [AuthRateThrottle]
    throttle_scope = "auth"

    def post(self, request, pk):
        akun = _akun_staff(pk)
        s = ResetPasswordSerializer(data=request.data, context={"user": akun})
        s.is_valid(raise_exception=True)
        services.reset_password(akun, s.validated_data["password"])
        return Response(status=status.HTTP_204_NO_CONTENT)


class Reset2faView(APIView):
    permission_classes = [IsAdmin]

    def post(self, request, pk):
        akun = _akun_admin(pk)
        services.reset_2fa(request.user, akun, ip=services.client_ip(request))
        return Response(status=status.HTTP_204_NO_CONTENT)


class OtpSetupView(APIView):
    permission_classes = [IsAdminBootstrap]
    throttle_classes = [ScopedRateThrottle, IpScopedRateThrottle]
    throttle_scope = "2fa"

    def post(self, request):
        secret = services.mulai_2fa(request.user)
        return Response(
            {
                "secret": secret,
                "otpauth_uri": totp.provisioning_uri(secret, request.user.email),
            }
        )


class OtpVerifyView(APIView):
    permission_classes = [IsAdminBootstrap]
    throttle_classes = [ScopedRateThrottle, IpScopedRateThrottle]
    throttle_scope = "2fa"

    def post(self, request):
        s = OtpVerifySerializer(data=request.data, context={"user": request.user})
        s.is_valid(raise_exception=True)
        services.verifikasi_2fa(request)
        return Response({"otp_enabled": True})
