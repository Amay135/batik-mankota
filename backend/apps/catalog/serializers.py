from rest_framework import serializers

from .models import FotoProduk, Kategori, Produk, Varian

AMBANG_STOK_SEDIKIT = 5


def status_stok(stok):
    if stok < 1:
        return "Habis"
    return "Tinggal sedikit" if stok <= AMBANG_STOK_SEDIKIT else "Tersedia"


def boleh_stok_angka(request):
    """PRD 5.10: angka stok persis hanya untuk admin dan kasir."""
    return bool(request and getattr(request.user, "role", None) in ("admin", "kasir"))


def url_foto(foto, request):
    if foto and foto.gambar:
        return request.build_absolute_uri(foto.gambar.url) if request else foto.gambar.url
    return None


class KategoriSerializer(serializers.ModelSerializer):
    jumlah = serializers.IntegerField(read_only=True)

    class Meta:
        model = Kategori
        fields = ["slug", "nama", "label_pendek", "jumlah"]


class DaftarKategoriSerializer(serializers.Serializer):
    total = serializers.IntegerField()
    kategori = KategoriSerializer(many=True)


class ProdukListSerializer(serializers.ModelSerializer):
    kategori = serializers.SerializerMethodField()
    teknik_label = serializers.CharField(read_only=True)
    label = serializers.CharField(read_only=True)
    foto_utama = serializers.SerializerMethodField()

    class Meta:
        model = Produk
        fields = [
            "id", "slug", "nama", "kategori", "teknik", "teknik_label", "label",
            "harga", "unggulan", "motif", "bentuk", "warna_utama", "foto_utama",
        ]

    def get_kategori(self, obj):
        return {"slug": obj.kategori.slug, "nama": obj.kategori.nama, "label_pendek": obj.kategori.label_pendek}

    def get_foto_utama(self, obj):
        fotos = list(obj.foto.all())
        return url_foto(fotos[0], self.context.get("request")) if fotos else None


class VarianSerializer(serializers.ModelSerializer):
    status_stok = serializers.SerializerMethodField()

    class Meta:
        model = Varian
        fields = ["id", "warna", "ukuran", "sku", "stok", "status_stok"]

    def get_status_stok(self, obj):
        return status_stok(obj.stok)

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data.pop("status_stok" if boleh_stok_angka(self.context.get("request")) else "stok")
        return data


class FotoSerializer(serializers.ModelSerializer):
    url = serializers.SerializerMethodField()

    class Meta:
        model = FotoProduk
        fields = ["jenis", "url"]

    def get_url(self, obj):
        return url_foto(obj, self.context.get("request"))


class ProdukDetailSerializer(ProdukListSerializer):
    varian = VarianSerializer(many=True, read_only=True)
    foto = FotoSerializer(many=True, read_only=True)
    tersedia = serializers.SerializerMethodField()
    terkait = serializers.SerializerMethodField()

    class Meta(ProdukListSerializer.Meta):
        fields = [
            *ProdukListSerializer.Meta.fields,
            "deskripsi", "bahan_detail", "perawatan", "koleksi", "perajin",
            "cerita_judul", "cerita_isi", "rating", "jumlah_ulasan", "terjual",
            "varian", "foto", "tersedia", "terkait",
        ]

    def get_tersedia(self, obj):
        return any(v.stok > 0 for v in obj.varian.all())

    def get_terkait(self, obj):
        qs = (
            Produk.objects.filter(aktif=True)
            .exclude(pk=obj.pk)
            .select_related("kategori")
            .prefetch_related("foto")
            .order_by("-terjual", "id")[:4]
        )
        return ProdukListSerializer(qs, many=True, context=self.context).data
