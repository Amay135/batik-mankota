from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import IsKasirOrAdmin
from apps.accounts.serializers import GalatSerializer
from apps.catalog.models import Varian

from .serializers import VarianScanSerializer


class VarianScanView(APIView):
    permission_classes = [IsKasirOrAdmin]

    @extend_schema(responses={200: VarianScanSerializer, 404: GalatSerializer})
    def get(self, request, token):
        varian = Varian.objects.select_related("produk", "stock").filter(
            aktif=True, produk__aktif=True
        )
        # Token dan SKU bisa kebetulan sama di dua varian berbeda; cek token dulu.
        hasil = (
            varian.filter(qr_token=token).first() or varian.filter(sku=token).first()
        )
        if hasil is None:
            return Response(
                {
                    "code": "VARIAN_TIDAK_DITEMUKAN",
                    "message": "Varian tidak ditemukan.",
                },
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response(VarianScanSerializer(hasil).data)
