from rest_framework import serializers

from apps.catalog.models import Produk, Varian

from .models import Stock, StockMovement, StockOpname, StockOpnameItem
from .selectors import stock_status


class StokSerializer(serializers.ModelSerializer):
    varian = serializers.IntegerField(source="variant_id", read_only=True)
    sku = serializers.CharField(source="variant.sku", read_only=True)
    produk = serializers.CharField(source="variant.produk.nama", read_only=True)
    ukuran = serializers.CharField(source="variant.ukuran", read_only=True)
    warna = serializers.CharField(source="variant.warna", read_only=True)
    stok_fisik = serializers.IntegerField(source="qty_on_hand", read_only=True)
    stok_terpesan = serializers.IntegerField(source="qty_reserved", read_only=True)
    stok_tersedia = serializers.IntegerField(read_only=True)
    stok_minimum = serializers.IntegerField(source="min_stock", read_only=True)
    status_stok = serializers.SerializerMethodField()

    class Meta:
        model = Stock
        fields = [
            "varian",
            "sku",
            "produk",
            "ukuran",
            "warna",
            "stok_fisik",
            "stok_terpesan",
            "stok_tersedia",
            "stok_minimum",
            "status_stok",
        ]

    def get_status_stok(self, obj) -> str:
        return stock_status(obj)


class MutasiSerializer(serializers.ModelSerializer):
    varian = serializers.IntegerField(source="variant_id", read_only=True)
    sku = serializers.CharField(source="variant.sku", read_only=True)
    tipe = serializers.CharField(source="type", read_only=True)
    tipe_label = serializers.CharField(source="get_type_display", read_only=True)
    pelaku = serializers.EmailField(
        source="actor.email", read_only=True, allow_null=True
    )
    catatan = serializers.CharField(source="note", read_only=True)
    dibuat = serializers.DateTimeField(source="created_at", read_only=True)

    class Meta:
        model = StockMovement
        fields = [
            "id",
            "varian",
            "sku",
            "tipe",
            "tipe_label",
            "qty_delta",
            "ref_type",
            "ref_id",
            "pelaku",
            "catatan",
            "dibuat",
        ]
        read_only_fields = fields


class FilterStokSerializer(serializers.Serializer):
    q = serializers.CharField(required=False, allow_blank=True)
    kategori = serializers.SlugField(required=False)
    ukuran = serializers.ChoiceField(choices=Varian.Ukuran.choices, required=False)
    warna = serializers.ChoiceField(choices=Produk.Warna.choices, required=False)


class FilterMutasiSerializer(serializers.Serializer):
    varian_id = serializers.IntegerField(required=False)
    tipe = serializers.ChoiceField(choices=StockMovement.Type.choices, required=False)
    dari = serializers.DateField(required=False)
    sampai = serializers.DateField(required=False)


class PenyesuaianSerializer(serializers.Serializer):
    varian_id = serializers.PrimaryKeyRelatedField(queryset=Varian.objects.all())
    qty_delta = serializers.IntegerField()
    alasan = serializers.CharField(max_length=255)

    def validate_qty_delta(self, value):
        if value == 0:
            raise serializers.ValidationError("Perubahan stok tidak boleh nol.")
        return value

    def validate_alasan(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Alasan wajib diisi.")
        return value


class MinimumStokSerializer(serializers.Serializer):
    min_stock = serializers.IntegerField(min_value=0)
    alasan = serializers.CharField(max_length=255)

    def validate_alasan(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Alasan wajib diisi.")
        return value


class OpnameItemMasukSerializer(serializers.Serializer):
    varian_id = serializers.PrimaryKeyRelatedField(queryset=Varian.objects.all())
    qty_fisik = serializers.IntegerField(min_value=0)


class BuatOpnameSerializer(serializers.Serializer):
    catatan = serializers.CharField(max_length=255)
    items = OpnameItemMasukSerializer(many=True, allow_empty=False)

    def validate_catatan(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Catatan wajib diisi.")
        return value

    def validate_items(self, value):
        ids = [item["varian_id"].pk for item in value]
        if len(ids) != len(set(ids)):
            raise serializers.ValidationError("Varian opname tidak boleh duplikat.")
        return value


class OpnameItemSerializer(serializers.ModelSerializer):
    varian = serializers.IntegerField(source="variant_id", read_only=True)
    sku = serializers.CharField(source="variant.sku", read_only=True)
    produk = serializers.CharField(source="variant.produk.nama", read_only=True)
    ukuran = serializers.CharField(source="variant.ukuran", read_only=True)
    warna = serializers.CharField(source="variant.warna", read_only=True)
    selisih = serializers.SerializerMethodField()

    class Meta:
        model = StockOpnameItem
        fields = [
            "varian",
            "sku",
            "produk",
            "ukuran",
            "warna",
            "system_qty",
            "counted_qty",
            "selisih",
        ]

    def get_selisih(self, obj) -> int:
        return obj.counted_qty - obj.system_qty


class OpnameSerializer(serializers.ModelSerializer):
    status_label = serializers.CharField(source="get_status_display", read_only=True)
    catatan = serializers.CharField(source="note", read_only=True)
    dibuat_oleh = serializers.EmailField(source="actor.email", read_only=True)
    items = OpnameItemSerializer(many=True, read_only=True)

    class Meta:
        model = StockOpname
        fields = [
            "id",
            "status",
            "status_label",
            "catatan",
            "dibuat_oleh",
            "created_at",
            "applied_at",
            "items",
        ]
