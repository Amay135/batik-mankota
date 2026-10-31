from django.db.models import Count, Exists, Max, Min, OuterRef, Q
from drf_spectacular.utils import extend_schema
from rest_framework.generics import ListAPIView, RetrieveAPIView
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Kategori, Produk, Varian
from .serializers import (
    DaftarKategoriSerializer,
    KategoriSerializer,
    ProdukDetailSerializer,
    ProdukListSerializer,
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
        return Response({
            "jumlah": self.page.paginator.count,
            "halaman": self.page.number,
            "per_halaman": self.page.paginator.per_page,
            "total_halaman": self.page.paginator.num_pages,
            "dari": self.page.start_index() if data else 0,
            "sampai": self.page.end_index() if data else 0,
            "hasil": data,
        })


def produk_aktif():
    return Produk.objects.filter(aktif=True)


class ProdukListView(ListAPIView):
    serializer_class = ProdukListSerializer
    pagination_class = KatalogPagination

    def get_queryset(self):
        p = self.request.query_params
        qs = produk_aktif().select_related("kategori").prefetch_related("foto")

        if kategori := p.get("kategori"):
            qs = qs.filter(kategori__slug=kategori)
        if q := p.get("q", "").strip():
            qs = qs.filter(Q(nama__icontains=q) | Q(motif__icontains=q.replace(" ", "-")) | Q(deskripsi__icontains=q))
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
            v = Varian.objects.filter(produk=OuterRef("pk"), stok__gt=0)
            if ukuran:
                v = v.filter(ukuran__in=ukuran)
            if warna:
                v = v.filter(warna__in=warna)
            qs = qs.filter(Exists(v))

        return qs.order_by(*URUTAN.get(p.get("urut", "populer"), URUTAN["populer"]))

    def list(self, request, *args, **kwargs):
        resp = super().list(request, *args, **kwargs)
        semua = produk_aktif()
        harga = semua.aggregate(minimum=Min("harga"), maksimum=Max("harga"))
        resp.data["meta"] = {
            "total_produk": semua.count(),
            "total_perajin": semua.exclude(perajin="").values("perajin").distinct().count(),
            "harga_min": harga["minimum"] or 0,
            "harga_maks": harga["maksimum"] or 0,
        }
        return resp


class KategoriListView(APIView):
    @extend_schema(responses=DaftarKategoriSerializer)
    def get(self, request):
        qs = Kategori.objects.annotate(jumlah=Count("produk", filter=Q(produk__aktif=True))).order_by("urutan", "id")
        data = KategoriSerializer(qs, many=True).data
        return Response({"total": produk_aktif().count(), "kategori": data})


class ProdukDetailView(RetrieveAPIView):
    serializer_class = ProdukDetailSerializer
    lookup_field = "slug"

    def get_queryset(self):
        return produk_aktif().select_related("kategori").prefetch_related("foto", "varian")
