from django.utils.html import strip_tags
from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from apps.inventory.selectors import available_for_variant

from .models import FotoProduk, Kategori, Motif, PanduanUkuran, Produk, Ulasan, Varian
from .qr import BATAS_HALAMAN, UKURAN_LABEL

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
        return (
            request.build_absolute_uri(foto.gambar.url) if request else foto.gambar.url
        )
    return None


class KategoriSerializer(serializers.ModelSerializer):
    jumlah = serializers.IntegerField(read_only=True)

    class Meta:
        model = Kategori
        fields = ["slug", "nama", "label_pendek", "jumlah"]


class DaftarKategoriSerializer(serializers.Serializer):
    total = serializers.IntegerField()
    kategori = KategoriSerializer(many=True)


class MotifSerializer(serializers.ModelSerializer):
    jumlah = serializers.IntegerField(read_only=True)

    class Meta:
        model = Motif
        fields = ["slug", "nama", "jumlah"]


class DaftarMotifSerializer(serializers.Serializer):
    total = serializers.IntegerField()
    motif = MotifSerializer(many=True)


class ProdukListSerializer(serializers.ModelSerializer):
    kategori = serializers.SerializerMethodField()
    motif = serializers.SlugRelatedField(slug_field="slug", read_only=True)
    teknik_label = serializers.CharField(read_only=True)
    label = serializers.CharField(read_only=True)
    deskripsi_singkat = serializers.SerializerMethodField()
    foto_utama = serializers.SerializerMethodField()

    class Meta:
        model = Produk
        fields = [
            "id",
            "slug",
            "nama",
            "kategori",
            "teknik",
            "teknik_label",
            "label",
            "deskripsi_singkat",
            "harga",
            "unggulan",
            "motif",
            "bentuk",
            "warna_utama",
            "foto_utama",
        ]

    def get_kategori(self, obj):
        return {
            "slug": obj.kategori.slug,
            "nama": obj.kategori.nama,
            "label_pendek": obj.kategori.label_pendek,
        }

    def get_deskripsi_singkat(self, obj) -> str:
        teks = obj.deskripsi.strip()
        return f"{teks[:120].rstrip()}…" if len(teks) > 120 else teks

    def get_foto_utama(self, obj):
        fotos = list(obj.foto.all())
        return url_foto(fotos[0], self.context.get("request")) if fotos else None


class VarianSerializer(serializers.ModelSerializer):
    stok = serializers.SerializerMethodField()
    status_stok = serializers.SerializerMethodField()

    class Meta:
        model = Varian
        fields = ["id", "warna", "ukuran", "sku", "stok", "status_stok"]

    @extend_schema_field({"type": "integer"})
    def get_stok(self, obj):
        return available_for_variant(obj)

    def get_status_stok(self, obj):
        return status_stok(available_for_variant(obj))

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data.pop(
            "status_stok" if boleh_stok_angka(self.context.get("request")) else "stok"
        )
        return data


class FotoSerializer(serializers.ModelSerializer):
    url = serializers.SerializerMethodField()

    class Meta:
        model = FotoProduk
        fields = ["jenis", "url"]

    def get_url(self, obj):
        return url_foto(obj, self.context.get("request"))


class UlasanTulisSerializer(serializers.ModelSerializer):
    rating = serializers.IntegerField(min_value=1, max_value=5)

    class Meta:
        model = Ulasan
        fields = ["rating", "teks"]

    def validate_teks(self, value) -> str:
        return strip_tags(value).strip()


class UlasanSerializer(serializers.ModelSerializer):
    nama = serializers.SerializerMethodField()

    class Meta:
        model = Ulasan
        fields = ["id", "nama", "rating", "teks", "dibuat"]

    def get_nama(self, obj) -> str:
        return obj.user.nama_lengkap or "Pelanggan"


class UlasanAdminSerializer(serializers.ModelSerializer):
    produk = serializers.SlugRelatedField(slug_field="slug", read_only=True)
    pengguna = serializers.EmailField(source="user.email", read_only=True)

    class Meta:
        model = Ulasan
        fields = ["id", "produk", "pengguna", "rating", "teks", "tampil", "dibuat"]
        read_only_fields = ["rating", "teks", "dibuat"]


class PanduanUkuranAdminSerializer(serializers.ModelSerializer):
    class Meta:
        model = PanduanUkuran
        fields = ["id", "kategori", "tabel", "diperbarui"]
        read_only_fields = ["diperbarui"]

    def validate_tabel(self, value):
        if not isinstance(value, list) or not 2 <= len(value) <= 20:
            raise serializers.ValidationError("Tabel harus berisi 2 sampai 20 baris.")
        if not isinstance(value[0], list) or not 2 <= len(value[0]) <= 10:
            raise serializers.ValidationError("Tabel harus berisi 2 sampai 10 kolom.")
        lebar = len(value[0])
        for baris in value:
            if not isinstance(baris, list) or len(baris) != lebar:
                raise serializers.ValidationError("Semua baris harus sama panjang.")
            if any(not isinstance(sel, str) or len(sel) > 20 for sel in baris):
                raise serializers.ValidationError(
                    "Setiap sel harus teks maksimal 20 karakter."
                )
        return value


class ProdukDetailSerializer(ProdukListSerializer):
    varian = VarianSerializer(many=True, read_only=True)
    foto = FotoSerializer(many=True, read_only=True)
    tersedia = serializers.SerializerMethodField()
    terkait = serializers.SerializerMethodField()
    ulasan = serializers.SerializerMethodField()
    panduan_ukuran = serializers.SerializerMethodField()

    class Meta(ProdukListSerializer.Meta):
        fields = [
            *ProdukListSerializer.Meta.fields,
            "deskripsi",
            "bahan_detail",
            "perawatan",
            "koleksi",
            "perajin",
            "cerita_judul",
            "cerita_isi",
            "rating",
            "jumlah_ulasan",
            "terjual",
            "varian",
            "foto",
            "tersedia",
            "terkait",
            "ulasan",
            "panduan_ukuran",
        ]

    @extend_schema_field(UlasanSerializer(many=True))
    def get_ulasan(self, obj):
        return UlasanSerializer(obj.ulasan.all(), many=True).data

    @extend_schema_field(
        {
            "type": "array",
            "nullable": True,
            "items": {"type": "array", "items": {"type": "string"}},
        }
    )
    def get_panduan_ukuran(self, obj):
        panduan = getattr(obj.kategori, "panduan_ukuran", None)
        return panduan.tabel if panduan else None

    def get_tersedia(self, obj):
        return any(available_for_variant(v) > 0 for v in obj.varian.all())

    def get_terkait(self, obj):
        qs = (
            Produk.objects.filter(aktif=True)
            .exclude(pk=obj.pk)
            .select_related("kategori", "motif")
            .prefetch_related("foto")
            .order_by("-terjual", "id")[:4]
        )
        return ProdukListSerializer(qs, many=True, context=self.context).data

class ProdukDetailTamuSerializer(ProdukListSerializer):
    foto = FotoSerializer(many=True, read_only=True)

    class Meta(ProdukListSerializer.Meta):
        fields = [
            *ProdukListSerializer.Meta.fields,
            "deskripsi",
            "foto",
        ]

# --- Serializer admin: hanya dipakai endpoint IsAdmin, boleh memuat harga_beli. ---


class KategoriAdminSerializer(serializers.ModelSerializer):
    class Meta:
        model = Kategori
        fields = ["id", "nama", "slug", "label_pendek", "urutan"]


class MotifAdminSerializer(serializers.ModelSerializer):
    class Meta:
        model = Motif
        fields = ["id", "nama", "slug", "deskripsi"]


class FotoAdminSerializer(serializers.ModelSerializer):
    url = serializers.SerializerMethodField()

    class Meta:
        model = FotoProduk
        fields = ["id", "jenis", "alt", "urutan", "url"]

    def get_url(self, obj) -> str | None:
        return url_foto(obj, self.context.get("request"))


class VarianAdminSerializer(serializers.ModelSerializer):
    stok = serializers.SerializerMethodField()
    status_stok = serializers.SerializerMethodField()

    class Meta:
        model = Varian
        # stok hanya dibaca: perubahan stok wajib lewat apps/inventory/services.py.
        fields = [
            "id",
            "produk",
            "warna",
            "ukuran",
            "sku",
            "harga_beli",
            "qr_token",
            "aktif",
            "stok",
            "status_stok",
        ]
        read_only_fields = ["produk", "qr_token"]

    @extend_schema_field({"type": "integer", "readOnly": True})
    def get_stok(self, obj) -> int:
        return available_for_variant(obj)

    def get_status_stok(self, obj) -> str:
        return status_stok(available_for_variant(obj))


class ProdukAdminSerializer(serializers.ModelSerializer):
    motif = serializers.SlugRelatedField(
        slug_field="slug", queryset=Motif.objects.all()
    )
    varian = VarianAdminSerializer(many=True, read_only=True)
    foto = FotoAdminSerializer(many=True, read_only=True)

    class Meta:
        model = Produk
        fields = [
            "id",
            "nama",
            "slug",
            "kategori",
            "teknik",
            "motif",
            "bentuk",
            "warna_utama",
            "koleksi",
            "perajin",
            "deskripsi",
            "bahan_detail",
            "perawatan",
            "cerita_judul",
            "cerita_isi",
            "harga",
            "rating",
            "jumlah_ulasan",
            "terjual",
            "unggulan",
            "aktif",
            "dibuat",
            "varian",
            "foto",
        ]
        read_only_fields = ["rating", "jumlah_ulasan", "terjual", "dibuat"]


class LabelItemSerializer(serializers.Serializer):
    # Varian nonaktif tidak boleh dicetak ulang labelnya.
    id = serializers.PrimaryKeyRelatedField(queryset=Varian.objects.filter(aktif=True))
    salinan = serializers.IntegerField(min_value=1, max_value=100, default=1)


class LabelCetakSerializer(serializers.Serializer):
    ukuran = serializers.ChoiceField(choices=list(UKURAN_LABEL), default="40x30")
    varian = LabelItemSerializer(many=True, required=False)
    produk = serializers.PrimaryKeyRelatedField(
        queryset=Produk.objects.all(), required=False
    )
    salinan = serializers.IntegerField(min_value=1, max_value=100, default=1)

    def validate(self, attrs):
        if not attrs.get("varian") and not attrs.get("produk"):
            raise serializers.ValidationError(
                {"varian": ["Pilih varian atau produk yang akan dicetak."]}
            )
        total = sum(item["salinan"] for item in attrs.get("varian", []))
        if produk := attrs.get("produk"):
            total += produk.varian.filter(aktif=True).count() * attrs["salinan"]
        if total > BATAS_HALAMAN:
            raise serializers.ValidationError(
                {"varian": [f"Maksimal {BATAS_HALAMAN} label per cetak."]}
            )
        return attrs


class UnggahFotoSerializer(serializers.Serializer):
    gambar = serializers.ImageField()
    jenis = serializers.ChoiceField(
        choices=FotoProduk.Jenis.choices, default=FotoProduk.Jenis.DEPAN
    )
    alt = serializers.CharField(max_length=160, allow_blank=True, default="")
    urutan = serializers.IntegerField(min_value=0, default=0)
