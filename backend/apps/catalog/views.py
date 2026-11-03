from django.db.models import Count, Exists, Max, Min, OuterRef, Prefetch, Q
from django.db.models.deletion import ProtectedError
from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.generics import (
    DestroyAPIView,
    ListAPIView,
    ListCreateAPIView,
    RetrieveAPIView,
    RetrieveUpdateDestroyAPIView,
)
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import IsAdmin
from apps.accounts.services import client_ip
from apps.inventory.selectors import available_stocks

from . import services
from .models import FotoProduk, Kategori, Motif, Produk, Varian
from .serializers import (
    DaftarKategoriSerializer,
    FotoAdminSerializer,
    KategoriAdminSerializer,
    KategoriSerializer,
    MotifAdminSerializer,
    ProdukAdminSerializer,
    ProdukDetailSerializer,
    ProdukDetailTamuSerializer,
    ProdukListSerializer,
    UnggahFotoSerializer,
    VarianAdminSerializer,
)

URUTAN = {
    "populer": ("-terjual", "id"),
    "terbaru": ("-dibuat", "-id"),
    "harga-terendah": ("harga", "id"),
    "harga-tertinggi": ("-harga", "id"),
}


class KatalogPagination(PageNumberPagination):
    page_size = 6
    page_size_query_param = "per_halaman"
    max_page_size = 48

    def get_paginated_response(self, data):
        return Response(
            {
                "jumlah": self.page.paginator.count,
                "halaman": self.page.number,
                "per_halaman": self.page.paginator.per_page,
                "total_halaman": self.page.paginator.num_pages,
                "dari": self.page.start_index() if data else 0,
                "sampai": self.page.end_index() if data else 0,
                "hasil": data,
            }
        )


def produk_aktif():
    return Produk.objects.filter(aktif=True)


class ProdukListView(ListAPIView):
    permission_classes = [AllowAny]
    serializer_class = ProdukListSerializer
    pagination_class = KatalogPagination

    def get_queryset(self):
        p = self.request.query_params
        qs = produk_aktif().select_related("kategori", "motif").prefetch_related("foto")

        if kategori := p.get("kategori"):
            qs = qs.filter(kategori__slug=kategori)
        if q := p.get("q", "").strip():
            qs = qs.filter(
                Q(nama__icontains=q)
                | Q(motif__slug__icontains=q.replace(" ", "-"))
                | Q(deskripsi__icontains=q)
            )
        if harga_min := p.get("harga_min"):
            if harga_min.isdigit():
                qs = qs.filter(harga__gte=int(harga_min))
        if harga_maks := p.get("harga_maks"):
            if harga_maks.isdigit():
                qs = qs.filter(harga__lte=int(harga_maks))
        if teknik := p.getlist("teknik"):
            qs = qs.filter(teknik__in=teknik)

        ukuran, warna = p.getlist("ukuran"), p.getlist("warna")
        if ukuran or warna:
            v = available_stocks(ukuran=ukuran, warna=warna).filter(
                variant__produk=OuterRef("pk")
            )
            qs = qs.filter(Exists(v))

        return qs.order_by(*URUTAN.get(p.get("urut", "populer"), URUTAN["populer"]))

    def list(self, request, *args, **kwargs):
        resp = super().list(request, *args, **kwargs)
        semua = produk_aktif()
        harga = semua.aggregate(minimum=Min("harga"), maksimum=Max("harga"))
        resp.data["meta"] = {
            "total_produk": semua.count(),
            "total_perajin": semua.exclude(perajin="")
            .values("perajin")
            .distinct()
            .count(),
            "harga_min": harga["minimum"] or 0,
            "harga_maks": harga["maksimum"] or 0,
        }
        return resp


class KategoriListView(APIView):
    permission_classes = [AllowAny]
    @extend_schema(responses=DaftarKategoriSerializer)
    def get(self, request):
        qs = Kategori.objects.annotate(
            jumlah=Count("produk", filter=Q(produk__aktif=True))
        ).order_by("urutan", "id")
        data = KategoriSerializer(qs, many=True).data
        return Response({"total": produk_aktif().count(), "kategori": data})


class ProdukDetailView(RetrieveAPIView):
    permission_classes = [AllowAny]
    lookup_field = "slug"

    def get_serializer_class(self):
        if self.request.user and self.request.user.is_authenticated:
            return ProdukDetailSerializer
        return ProdukDetailTamuSerializer

    def get_queryset(self):
        return (
            produk_aktif()
            .select_related("kategori", "motif")
            .prefetch_related(
                "foto",
                Prefetch("varian", queryset=Varian.objects.select_related("stock")),
            )
        )


# --- Pengelolaan (admin): /api/v1/katalog/kelola/ ---


def _masih_dipakai(pesan):
    return Response(
        {"code": "MASIH_DIPAKAI", "message": pesan}, status=status.HTTP_409_CONFLICT
    )


class KategoriAdminListCreateView(ListCreateAPIView):
    permission_classes = [IsAdmin]
    queryset = Kategori.objects.all()
    serializer_class = KategoriAdminSerializer


class KategoriAdminDetailView(RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAdmin]
    queryset = Kategori.objects.all()
    serializer_class = KategoriAdminSerializer

    def destroy(self, request, *args, **kwargs):
        try:
            return super().destroy(request, *args, **kwargs)
        except ProtectedError:
            return _masih_dipakai("Kategori masih dipakai produk.")


class MotifAdminListCreateView(ListCreateAPIView):
    permission_classes = [IsAdmin]
    queryset = Motif.objects.all()
    serializer_class = MotifAdminSerializer


class MotifAdminDetailView(RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAdmin]
    queryset = Motif.objects.all()
    serializer_class = MotifAdminSerializer

    def destroy(self, request, *args, **kwargs):
        try:
            return super().destroy(request, *args, **kwargs)
        except ProtectedError:
            return _masih_dipakai("Motif masih dipakai produk.")


def _produk_admin():
    return Produk.objects.select_related("kategori", "motif").prefetch_related(
        Prefetch("varian", queryset=Varian.objects.select_related("stock")), "foto"
    )


class ProdukAdminListCreateView(ListCreateAPIView):
    permission_classes = [IsAdmin]
    queryset = _produk_admin()
    serializer_class = ProdukAdminSerializer


class ProdukAdminDetailView(RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAdmin]
    queryset = _produk_admin()
    serializer_class = ProdukAdminSerializer

    def perform_update(self, serializer):
        harga_lama = serializer.instance.harga
        produk = serializer.save()
        services.catat_perubahan_harga_produk(
            actor=self.request.user,
            produk=produk,
            harga_lama=harga_lama,
            ip=client_ip(self.request),
        )

    def perform_destroy(self, instance):
        # Nonaktifkan, jangan hapus: riwayat pesanan dan audit harus tetap utuh.
        instance.aktif = False
        instance.save(update_fields=["aktif"])


class VarianAdminListCreateView(ListCreateAPIView):
    permission_classes = [IsAdmin]
    serializer_class = VarianAdminSerializer

    def get_queryset(self):
        return (
            Varian.objects.filter(produk_id=self.kwargs["pk"])
            .select_related("stock")
            .order_by("id")
        )

    def perform_create(self, serializer):
        serializer.save(produk=get_object_or_404(Produk, pk=self.kwargs["pk"]))


class VarianAdminDetailView(RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAdmin]
    queryset = Varian.objects.select_related("produk", "stock")
    serializer_class = VarianAdminSerializer

    def perform_update(self, serializer):
        harga_lama = serializer.instance.harga_beli
        varian = serializer.save()
        services.catat_perubahan_harga_beli(
            actor=self.request.user,
            varian=varian,
            harga_lama=harga_lama,
            ip=client_ip(self.request),
        )

    def perform_destroy(self, instance):
        instance.aktif = False
        instance.save(update_fields=["aktif"])


class FotoAdminCreateView(APIView):
    permission_classes = [IsAdmin]

    @extend_schema(request=UnggahFotoSerializer, responses={201: FotoAdminSerializer})
    def post(self, request, pk):
        produk = get_object_or_404(Produk, pk=pk)
        data = UnggahFotoSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        foto = services.simpan_foto(
            produk=produk,
            berkas=data.validated_data["gambar"],
            jenis=data.validated_data["jenis"],
            alt=data.validated_data["alt"],
            urutan=data.validated_data["urutan"],
        )
        return Response(
            FotoAdminSerializer(foto, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class FotoAdminDetailView(DestroyAPIView):
    permission_classes = [IsAdmin]
    queryset = FotoProduk.objects.all()
    serializer_class = FotoAdminSerializer
