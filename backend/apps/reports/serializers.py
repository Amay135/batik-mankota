from rest_framework import serializers

from apps.audit.models import AuditLog


class AktivitasDasborSerializer(serializers.ModelSerializer):
    aksi_label = serializers.CharField(source="get_action_display", read_only=True)
    pelaku = serializers.EmailField(source="actor.email", read_only=True)

    class Meta:
        model = AuditLog
        # before/after sengaja tidak dikirim; ringkasan cukup aksi dan waktunya.
        fields = [
            "id",
            "action",
            "aksi_label",
            "pelaku",
            "entity",
            "entity_id",
            "created_at",
        ]
        read_only_fields = fields


class RingkasanDasborSerializer(serializers.Serializer):
    tanggal = serializers.DateField()
    penjualan_hari_ini = serializers.IntegerField()
    pesanan_hari_ini = serializers.IntegerField()
    pesanan_menunggu_pembayaran = serializers.IntegerField()
    produk_terjual_hari_ini = serializers.IntegerField()
    varian_stok_menipis = serializers.IntegerField()
    varian_stok_habis = serializers.IntegerField()
    aktivitas = AktivitasDasborSerializer(many=True)
