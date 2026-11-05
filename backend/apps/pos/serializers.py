from rest_framework import serializers

from apps.catalog.models import Varian
from apps.inventory.selectors import available_for_variant


class VarianScanSerializer(serializers.ModelSerializer):
    nama = serializers.CharField(source="produk.nama")
    warna = serializers.CharField(source="get_warna_display")
    ukuran = serializers.CharField(source="get_ukuran_display")
    harga = serializers.IntegerField(source="produk.harga")
    stok = serializers.SerializerMethodField()

    class Meta:
        model = Varian
        fields = ["id", "nama", "sku", "warna", "ukuran", "harga", "stok"]

    def get_stok(self, obj) -> int:
        return available_for_variant(obj)
