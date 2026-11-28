from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from apps.orders.models import Pesanan

from . import selectors, services
from .models import Pelanggan

SORTIR = {
    "nama": "nama",
    "dibuat": "dibuat",
    "transaksi": "jumlah_transaksi",
    "belanja": "total_belanja",
    "terakhir": "terakhir_belanja",
}


class PelangganSerializer(serializers.ModelSerializer):
    """Data pelanggan + statistik pesanan (dihitung, tidak disimpan sebagai snapshot)."""

    jumlah_transaksi = serializers.IntegerField(read_only=True)
    total_belanja = serializers.IntegerField(read_only=True)
    terakhir_belanja = serializers.DateTimeField(read_only=True, allow_null=True)

    class Meta:
        model = Pelanggan
        fields = [
            "id",
            "nama",
            "telepon",
            "email",
            "alamat",
            "catatan",
            "dibuat",
            "diperbarui",
            "jumlah_transaksi",
            "total_belanja",
            "terakhir_belanja",
        ]
        read_only_fields = ["dibuat", "diperbarui"]

    def validate_nama(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Nama pelanggan wajib diisi.")
        return value

    def validate_telepon(self, value):
        try:
            nomor = services.validasi_telepon(value)
        except ValueError as exc:
            raise serializers.ValidationError(str(exc)) from exc
        if nomor:
            qs = Pelanggan.objects.filter(telepon=nomor)
            if self.instance:
                qs = qs.exclude(pk=self.instance.pk)
            if qs.exists():
                raise serializers.ValidationError(
                    "Nomor telepon sudah terdaftar pada pelanggan lain."
                )
        return nomor

    def validate_email(self, value):
        return value.strip().lower()


class StatistikPelangganSerializer(serializers.Serializer):
    jumlah_transaksi = serializers.IntegerField()
    total_belanja = serializers.IntegerField()
    rata_rata_transaksi = serializers.IntegerField()
    transaksi_selesai = serializers.IntegerField()
    terakhir_belanja = serializers.DateTimeField(allow_null=True)


class PelangganDetailSerializer(PelangganSerializer):
    statistik = serializers.SerializerMethodField()

    class Meta(PelangganSerializer.Meta):
        fields = [*PelangganSerializer.Meta.fields, "statistik"]

    @extend_schema_field(StatistikPelangganSerializer)
    def get_statistik(self, obj) -> dict:
        statistik = selectors.statistik_pelanggan(obj)
        # Format waktu harus sama dengan field terakhir_belanja di atas.
        statistik["terakhir_belanja"] = self.fields[
            "terakhir_belanja"
        ].to_representation(statistik["terakhir_belanja"])
        return statistik


class PesananPelangganSerializer(serializers.ModelSerializer):
    status_label = serializers.CharField(source="get_status_display", read_only=True)
    metode_label = serializers.CharField(
        source="get_metode_bayar_display", read_only=True
    )
    produk = serializers.SerializerMethodField()
    jumlah_item = serializers.SerializerMethodField()

    class Meta:
        model = Pesanan
        fields = [
            "nomor",
            "status",
            "status_label",
            "dibuat",
            "total",
            "metode_bayar",
            "metode_label",
            "produk",
            "jumlah_item",
        ]

    def get_produk(self, obj) -> list[str]:
        return [item.nama for item in obj.item.all()]

    def get_jumlah_item(self, obj) -> int:
        return sum(item.jumlah for item in obj.item.all())


class RingkasanPelangganSerializer(serializers.Serializer):
    total_pelanggan = serializers.IntegerField()
    pelanggan_dengan_transaksi = serializers.IntegerField()
    total_transaksi = serializers.IntegerField()
    total_nilai_transaksi = serializers.IntegerField()


class FilterPelangganSerializer(serializers.Serializer):
    q = serializers.CharField(required=False, allow_blank=True)
    sortir = serializers.ChoiceField(
        choices=list(SORTIR), required=False, default="nama"
    )
    arah = serializers.ChoiceField(
        choices=["asc", "desc"], required=False, default="asc"
    )
