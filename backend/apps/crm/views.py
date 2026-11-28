from django.db.models import Q
from django.db.models.deletion import ProtectedError
from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.generics import (
    ListAPIView,
    ListCreateAPIView,
    RetrieveUpdateDestroyAPIView,
)
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import IsAdmin, IsKasirOrAdmin

from . import selectors
from .models import Pelanggan
from .serializers import (
    SORTIR,
    FilterPelangganSerializer,
    PelangganDetailSerializer,
    PelangganSerializer,
    PesananPelangganSerializer,
    RingkasanPelangganSerializer,
)


class PelangganPagination(PageNumberPagination):
    page_size = 25
    page_size_query_param = "per_halaman"
    max_page_size = 200


@extend_schema(parameters=[FilterPelangganSerializer])
class PelangganListCreateView(ListCreateAPIView):
    # Kasir boleh mencari & mendaftarkan pelanggan (matriks PRD), sisanya admin.
    permission_classes = [IsKasirOrAdmin]
    serializer_class = PelangganSerializer
    pagination_class = PelangganPagination

    def get_queryset(self):
        f = FilterPelangganSerializer(data=self.request.query_params)
        f.is_valid(raise_exception=True)
        p = f.validated_data
        qs = selectors.pelanggan_dengan_statistik()
        if q := p.get("q"):
            qs = qs.filter(
                Q(nama__icontains=q) | Q(telepon__icontains=q) | Q(email__icontains=q)
            )
        arah = "-" if p["arah"] == "desc" else ""
        return qs.order_by(f"{arah}{SORTIR[p['sortir']]}", "id")

    def create(self, request, *args, **kwargs):
        data = self.get_serializer(data=request.data)
        data.is_valid(raise_exception=True)
        pelanggan = data.save()
        # Statistik berasal dari anotasi queryset; muat ulang setelah simpan.
        tersimpan = selectors.pelanggan_dengan_statistik().get(pk=pelanggan.pk)
        return Response(
            PelangganSerializer(tersimpan).data, status=status.HTTP_201_CREATED
        )


class PelangganDetailView(RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAdmin]
    serializer_class = PelangganDetailSerializer

    def get_queryset(self):
        return selectors.pelanggan_dengan_statistik()

    def destroy(self, request, *args, **kwargs):
        try:
            self.get_object().delete()
        except ProtectedError:
            return Response(
                {
                    "code": "PELANGGAN_PUNYA_TRANSAKSI",
                    "message": "Pelanggan sudah memiliki transaksi dan tidak dapat dihapus.",
                },
                status=status.HTTP_409_CONFLICT,
            )
        return Response(status=status.HTTP_204_NO_CONTENT)


class RiwayatPesananView(ListAPIView):
    permission_classes = [IsAdmin]
    serializer_class = PesananPelangganSerializer
    pagination_class = PelangganPagination

    def get_queryset(self):
        pelanggan = get_object_or_404(Pelanggan, pk=self.kwargs["pk"])
        # Semua status ditampilkan; statistik di detail hanya menghitung yang berhasil.
        return pelanggan.pesanan.prefetch_related("item").order_by("-dibuat", "-id")


class RingkasanPelangganView(APIView):
    permission_classes = [IsAdmin]

    @extend_schema(responses=RingkasanPelangganSerializer)
    def get(self, request):
        return Response(
            RingkasanPelangganSerializer(selectors.ringkasan_pelanggan()).data
        )
