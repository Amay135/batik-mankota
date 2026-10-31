from django.db import transaction
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.generics import RetrieveAPIView
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import IsUser
from apps.catalog.models import Varian

from . import services
from .models import ItemKeranjang, Pesanan, Voucher
from .serializers import (
    BuatPesananSerializer,
    ItemKeranjangSerializer,
    KodeVoucherSerializer,
    KeranjangSerializer,
    PesananSerializer,
    TambahItemSerializer,
    UbahJumlahSerializer,
)


def respons_keranjang(request):
    k = services.keranjang_user(request.user)
    k.refresh_from_db()
    items = services.item_keranjang(k)
    return Response({
        "item": ItemKeranjangSerializer(items, many=True, context={"request": request}).data,
        "ringkasan": services.hitung_ringkasan(items, k.voucher),
    })


class KeranjangView(APIView):
    permission_classes = [IsUser]

    @extend_schema(responses=KeranjangSerializer)
    def get(self, request):
        return respons_keranjang(request)


class TambahItemView(APIView):
    permission_classes = [IsUser]

    @extend_schema(request=TambahItemSerializer, responses=KeranjangSerializer)
    @transaction.atomic
    def post(self, request):
        try:
            varian = Varian.objects.select_related("produk").get(pk=request.data.get("varian_id"), produk__aktif=True)
            jumlah = int(request.data.get("jumlah", 1))
        except (Varian.DoesNotExist, TypeError, ValueError):
            raise ValidationError({"detail": "Varian produk tidak ditemukan."})
        if jumlah < 1:
            raise ValidationError({"detail": "Jumlah minimal 1."})

        k = services.keranjang_user(request.user)
        item, _ = ItemKeranjang.objects.get_or_create(keranjang=k, varian=varian, defaults={"jumlah": 0})
        if item.jumlah + jumlah > varian.stok:
            raise ValidationError({"detail": "Stok habis." if varian.stok < 1 else "Jumlah melebihi stok yang tersedia."})
        item.jumlah += jumlah
        item.save(update_fields=["jumlah"])
        return respons_keranjang(request)


class ItemView(APIView):
    permission_classes = [IsUser]

    def _item(self, request, pk):
        k = services.keranjang_user(request.user)
        try:
            return k.item.select_related("varian").get(pk=pk)
        except ItemKeranjang.DoesNotExist:
            raise ValidationError({"detail": "Item tidak ditemukan."})

    @extend_schema(request=UbahJumlahSerializer, responses=KeranjangSerializer)
    def patch(self, request, pk):
        item = self._item(request, pk)
        try:
            jumlah = int(request.data.get("jumlah"))
        except (TypeError, ValueError):
            raise ValidationError({"detail": "Jumlah tidak valid."})
        if jumlah < 1:
            raise ValidationError({"detail": "Jumlah minimal 1."})
        if jumlah > item.varian.stok:
            raise ValidationError({"detail": "Stok habis." if item.varian.stok < 1 else "Jumlah melebihi stok yang tersedia."})
        item.jumlah = jumlah
        item.save(update_fields=["jumlah"])
        return respons_keranjang(request)

    @extend_schema(request=None, responses=KeranjangSerializer)
    def delete(self, request, pk):
        self._item(request, pk).delete()
        return respons_keranjang(request)


class VoucherView(APIView):
    permission_classes = [IsUser]

    @extend_schema(request=KodeVoucherSerializer, responses=KeranjangSerializer)
    def post(self, request):
        kode = str(request.data.get("kode", "")).strip().upper()
        try:
            voucher = Voucher.objects.get(kode__iexact=kode)
        except Voucher.DoesNotExist:
            raise ValidationError({"detail": "Kode voucher tidak ditemukan."})
        k = services.keranjang_user(request.user)
        items = services.item_keranjang(k)
        galat = voucher.cek(services.hitung_ringkasan(items)["subtotal"])
        if galat:
            raise ValidationError({"detail": galat})
        k.voucher = voucher
        k.save(update_fields=["voucher"])
        return respons_keranjang(request)

    @extend_schema(request=None, responses=KeranjangSerializer)
    def delete(self, request):
        k = services.keranjang_user(request.user)
        k.voucher = None
        k.save(update_fields=["voucher"])
        return respons_keranjang(request)


class PesananListCreateView(APIView):
    permission_classes = [IsUser]

    @extend_schema(responses=PesananSerializer(many=True))
    def get(self, request):
        qs = Pesanan.objects.filter(user=request.user).prefetch_related("item")
        return Response(PesananSerializer(qs, many=True).data)

    @extend_schema(request=BuatPesananSerializer, responses={201: PesananSerializer})
    def post(self, request):
        s = BuatPesananSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        pesanan = services.buat_pesanan(request.user, s.validated_data)
        return Response(PesananSerializer(pesanan).data, status=status.HTTP_201_CREATED)


class PesananDetailView(RetrieveAPIView):
    permission_classes = [IsUser]
    serializer_class = PesananSerializer
    lookup_field = "nomor"

    def get_queryset(self):
        return Pesanan.objects.filter(user=self.request.user).prefetch_related("item")
