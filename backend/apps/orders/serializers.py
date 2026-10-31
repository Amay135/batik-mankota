from rest_framework import serializers

from apps.catalog.serializers import boleh_stok_angka, status_stok, url_foto

from .models import ItemKeranjang, ItemPesanan, Pesanan


class ItemKeranjangSerializer(serializers.ModelSerializer):
    varian = serializers.SerializerMethodField()
    produk = serializers.SerializerMethodField()
    harga = serializers.SerializerMethodField()
    subtotal = serializers.SerializerMethodField()

    class Meta:
        model = ItemKeranjang
        fields = ["id", "jumlah", "varian", "produk", "harga", "subtotal"]

    def get_varian(self, o):
        v = o.varian
        data = {"id": v.id, "sku": v.sku, "warna": v.warna, "ukuran": v.ukuran}
        if boleh_stok_angka(self.context.get("request")):
            data["stok"] = v.stok
        else:
            data["status_stok"] = status_stok(v.stok)
        return data

    def get_produk(self, o):
        p = o.varian.produk
        fotos = list(p.foto.all())
        return {
            "slug": p.slug, "nama": p.nama, "motif": p.motif, "bentuk": p.bentuk,
            "warna_utama": p.warna_utama,
            "foto_utama": url_foto(fotos[0], self.context.get("request")) if fotos else None,
        }

    def get_harga(self, o):
        return o.varian.produk.harga

    def get_subtotal(self, o):
        return o.varian.produk.harga * o.jumlah


class ItemPesananSerializer(serializers.ModelSerializer):
    subtotal = serializers.IntegerField(read_only=True)

    class Meta:
        model = ItemPesanan
        fields = ["nama", "slug", "motif", "bentuk", "warna", "ukuran", "sku", "harga", "jumlah", "subtotal"]


class PesananSerializer(serializers.ModelSerializer):
    item = ItemPesananSerializer(many=True, read_only=True)
    status_label = serializers.CharField(source="get_status_display", read_only=True)
    metode_label = serializers.CharField(source="get_metode_bayar_display", read_only=True)

    class Meta:
        model = Pesanan
        fields = [
            "nomor", "status", "status_label", "nama_lengkap", "whatsapp", "email", "alamat", "provinsi",
            "kota", "kecamatan", "kode_pos", "kurir", "voucher_kode", "subtotal", "ongkir", "promo_ongkir",
            "diskon", "total", "metode_bayar", "metode_label", "bank", "nomor_va", "batas_bayar", "dibuat", "item",
        ]


class BuatPesananSerializer(serializers.Serializer):
    nama_lengkap = serializers.CharField(max_length=120)
    whatsapp = serializers.RegexField(r"^[0-9+\s-]{9,20}$", error_messages={"invalid": "Nomor WhatsApp tidak valid."})
    email = serializers.EmailField()
    alamat = serializers.CharField(max_length=255)
    provinsi = serializers.CharField(max_length=60)
    kota = serializers.CharField(max_length=80)
    kecamatan = serializers.CharField(max_length=80)
    kode_pos = serializers.RegexField(r"^\d{5}$", error_messages={"invalid": "Kode pos harus 5 digit."})
    metode_bayar = serializers.ChoiceField(choices=Pesanan.Metode.choices)
    bank = serializers.ChoiceField(choices=["bca", "bni", "mandiri", "bri"], required=False, allow_blank=True)

    def validate(self, attrs):
        if attrs["metode_bayar"] == Pesanan.Metode.TRANSFER and not attrs.get("bank"):
            raise serializers.ValidationError({"bank": "Pilih bank tujuan."})
        return attrs
