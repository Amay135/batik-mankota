from django.db.models import F, Q
from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.generics import ListAPIView, RetrieveAPIView
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import IsAdmin, IsKasirOrAdmin
from apps.accounts.serializers import GalatSerializer

from . import services
from .exceptions import InsufficientStock, OpnameSudahDiterapkan
from .models import Stock, StockMovement, StockOpname
from .serializers import (
    BuatOpnameSerializer,
    FilterMutasiSerializer,
    FilterStokSerializer,
    MinimumStokSerializer,
    MutasiSerializer,
    OpnameSerializer,
    PenyesuaianSerializer,
    StokSerializer,
)


class StokPagination(PageNumberPagination):
    page_size = 50
    page_size_query_param = "per_halaman"
    max_page_size = 200


def _stok_queryset():
    return Stock.objects.select_related("variant", "variant__produk").annotate(
        stok_tersedia=F("qty_on_hand") - F("qty_reserved")
    )


def _opname_queryset():
    return StockOpname.objects.select_related("actor").prefetch_related(
        "items__variant__produk"
    )


def _galat(code: str, message: str, status_code: int) -> Response:
    return Response({"code": code, "message": message}, status=status_code)


@extend_schema(parameters=[FilterStokSerializer])
class StokListView(ListAPIView):
    permission_classes = [IsKasirOrAdmin]
    serializer_class = StokSerializer
    pagination_class = StokPagination

    def get_queryset(self):
        f = FilterStokSerializer(data=self.request.query_params)
        f.is_valid(raise_exception=True)
        p = f.validated_data
        qs = _stok_queryset()

        if q := p.get("q"):
            qs = qs.filter(
                Q(variant__sku__icontains=q) | Q(variant__produk__nama__icontains=q)
            )
        if kategori := p.get("kategori"):
            qs = qs.filter(variant__produk__kategori__slug=kategori)
        if ukuran := p.get("ukuran"):
            qs = qs.filter(variant__ukuran=ukuran)
        if warna := p.get("warna"):
            qs = qs.filter(variant__warna=warna)
        return qs.order_by("variant_id")


@extend_schema(parameters=[FilterStokSerializer])
class StokMenipisView(StokListView):
    def get_queryset(self):
        return super().get_queryset().filter(stok_tersedia__lte=F("min_stock"))


@extend_schema(parameters=[FilterMutasiSerializer])
class MutasiListView(ListAPIView):
    permission_classes = [IsAdmin]
    serializer_class = MutasiSerializer
    pagination_class = StokPagination
    queryset = StockMovement.objects.select_related("variant", "actor")

    def get_queryset(self):
        qs = super().get_queryset()
        f = FilterMutasiSerializer(data=self.request.query_params)
        f.is_valid(raise_exception=True)
        p = f.validated_data

        if varian_id := p.get("varian_id"):
            qs = qs.filter(variant_id=varian_id)
        if tipe := p.get("tipe"):
            qs = qs.filter(type=tipe)
        if dari := p.get("dari"):
            qs = qs.filter(created_at__date__gte=dari)
        if sampai := p.get("sampai"):
            qs = qs.filter(created_at__date__lte=sampai)
        return qs.order_by("-created_at", "-id")


class PenyesuaianCreateView(APIView):
    permission_classes = [IsAdmin]

    @extend_schema(
        request=PenyesuaianSerializer,
        responses={201: MutasiSerializer, 409: GalatSerializer},
    )
    def post(self, request):
        data = PenyesuaianSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        varian = data.validated_data["varian_id"]
        try:
            movement = services.adjust(
                varian.pk,
                data.validated_data["qty_delta"],
                actor=request.user,
                note=data.validated_data["alasan"],
            )
        except InsufficientStock:
            return _galat(
                "INSUFFICIENT_STOCK", "Stok tidak mencukupi.", status.HTTP_409_CONFLICT
            )
        except Stock.DoesNotExist:
            return _galat(
                "STOCK_NOT_FOUND",
                "Stok varian tidak ditemukan.",
                status.HTTP_409_CONFLICT,
            )
        except ValueError as exc:
            return _galat("INVALID_ADJUSTMENT", str(exc), status.HTTP_400_BAD_REQUEST)
        return Response(MutasiSerializer(movement).data, status=status.HTTP_201_CREATED)


class MinimumStokView(APIView):
    permission_classes = [IsAdmin]

    @extend_schema(
        request=MinimumStokSerializer,
        responses={200: StokSerializer, 404: GalatSerializer},
    )
    def patch(self, request, pk):
        data = MinimumStokSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        try:
            services.ubah_min_stock(
                pk,
                data.validated_data["min_stock"],
                actor=request.user,
                note=data.validated_data["alasan"],
            )
        except Stock.DoesNotExist:
            return _galat(
                "STOCK_NOT_FOUND",
                "Stok varian tidak ditemukan.",
                status.HTTP_404_NOT_FOUND,
            )
        except ValueError as exc:
            return _galat("INVALID_MIN_STOCK", str(exc), status.HTTP_400_BAD_REQUEST)
        return Response(StokSerializer(_stok_queryset().get(pk=pk)).data)


class OpnameCreateView(APIView):
    permission_classes = [IsAdmin]

    @extend_schema(
        request=BuatOpnameSerializer,
        responses={201: OpnameSerializer, 409: GalatSerializer},
    )
    def post(self, request):
        data = BuatOpnameSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        items = [
            (item["varian_id"].pk, item["qty_fisik"])
            for item in data.validated_data["items"]
        ]
        try:
            opname = services.buat_opname(
                items,
                actor=request.user,
                note=data.validated_data["catatan"],
            )
        except Stock.DoesNotExist:
            return _galat(
                "STOCK_NOT_FOUND",
                "Stok varian tidak ditemukan.",
                status.HTTP_409_CONFLICT,
            )
        except ValueError as exc:
            return _galat("INVALID_OPNAME", str(exc), status.HTTP_400_BAD_REQUEST)
        return Response(
            OpnameSerializer(_opname_queryset().get(pk=opname.pk)).data,
            status=status.HTTP_201_CREATED,
        )


class OpnameDetailView(RetrieveAPIView):
    permission_classes = [IsAdmin]
    serializer_class = OpnameSerializer
    queryset = _opname_queryset()


class OpnameTerapkanView(APIView):
    permission_classes = [IsAdmin]

    @extend_schema(
        request=None, responses={200: OpnameSerializer, 409: GalatSerializer}
    )
    def post(self, request, pk):
        opname = get_object_or_404(StockOpname, pk=pk)
        try:
            services.terapkan_opname(opname.pk, actor=request.user)
        except OpnameSudahDiterapkan:
            return _galat(
                "OPNAME_ALREADY_APPLIED",
                "Opname sudah diterapkan.",
                status.HTTP_409_CONFLICT,
            )
        except InsufficientStock:
            return _galat(
                "INSUFFICIENT_STOCK", "Stok tidak mencukupi.", status.HTTP_409_CONFLICT
            )
        except Stock.DoesNotExist:
            return _galat(
                "STOCK_NOT_FOUND",
                "Stok varian tidak ditemukan.",
                status.HTTP_409_CONFLICT,
            )
        except ValueError as exc:
            return _galat("INVALID_OPNAME", str(exc), status.HTTP_400_BAD_REQUEST)
        return Response(OpnameSerializer(_opname_queryset().get(pk=pk)).data)
