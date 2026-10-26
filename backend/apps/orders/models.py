from django.conf import settings
from django.db import models
from django.utils import timezone


class Voucher(models.Model):
    class Tipe(models.TextChoices):
        PERSEN = "persen", "Persen"
        NOMINAL = "nominal", "Nominal"

    kode = models.CharField(max_length=30, unique=True)
    tipe = models.CharField(max_length=8, choices=Tipe.choices)
    nilai = models.PositiveIntegerField()
    maks_diskon = models.PositiveIntegerField(default=0, help_text="0 = tanpa batas (untuk tipe persen)")
    min_belanja = models.PositiveIntegerField(default=0)
    aktif = models.BooleanField(default=True)
    berlaku_hingga = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return self.kode

    def cek(self, subtotal):
        """Mengembalikan pesan galat bila voucher tidak bisa dipakai, selain itu None."""
        if not self.aktif or (self.berlaku_hingga and self.berlaku_hingga < timezone.now()):
            return "Voucher sudah tidak berlaku."
        if subtotal < self.min_belanja:
            return f"Minimal belanja Rp{self.min_belanja:,}".replace(",", ".") + " untuk voucher ini."
        return None

    def hitung(self, subtotal):
        if self.tipe == self.Tipe.PERSEN:
            diskon = subtotal * self.nilai // 100
            if self.maks_diskon:
                diskon = min(diskon, self.maks_diskon)
        else:
            diskon = self.nilai
        return min(diskon, subtotal)


class Keranjang(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="keranjang")
    voucher = models.ForeignKey(Voucher, null=True, blank=True, on_delete=models.SET_NULL)
    diperbarui = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = "keranjang"


class ItemKeranjang(models.Model):
    keranjang = models.ForeignKey(Keranjang, on_delete=models.CASCADE, related_name="item")
    varian = models.ForeignKey("catalog.Varian", on_delete=models.CASCADE)
    jumlah = models.PositiveIntegerField(default=1)

    class Meta:
        ordering = ["id"]
        constraints = [models.UniqueConstraint(fields=["keranjang", "varian"], name="item_keranjang_unik")]


class Pesanan(models.Model):
    class Status(models.TextChoices):
        MENUNGGU = "menunggu_pembayaran", "Menunggu pembayaran"
        DIBAYAR = "dibayar", "Sudah dibayar"
        DIPROSES = "diproses", "Sedang diproses"
        DIKIRIM = "dikirim", "Dalam pengiriman"
        SELESAI = "selesai", "Selesai"
        BATAL = "dibatalkan", "Dibatalkan"

    class Metode(models.TextChoices):
        TRANSFER = "transfer_bank", "Transfer Bank"
        QRIS = "qris", "QRIS"
        DOMPET = "dompet_digital", "Dompet Digital"

    nomor = models.CharField(max_length=24, unique=True)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="pesanan")
    status = models.CharField(max_length=24, choices=Status.choices, default=Status.MENUNGGU)

    nama_lengkap = models.CharField(max_length=120)
    whatsapp = models.CharField(max_length=20)
    email = models.EmailField()
    alamat = models.CharField(max_length=255)
    provinsi = models.CharField(max_length=60)
    kota = models.CharField(max_length=80)
    kecamatan = models.CharField(max_length=80)
    kode_pos = models.CharField(max_length=10)

    kurir = models.CharField(max_length=40, default="JNE REG")
    voucher_kode = models.CharField(max_length=30, blank=True)
    subtotal = models.PositiveIntegerField()
    ongkir = models.PositiveIntegerField()
    promo_ongkir = models.PositiveIntegerField(default=0)
    diskon = models.PositiveIntegerField(default=0)
    total = models.PositiveIntegerField()

    metode_bayar = models.CharField(max_length=20, choices=Metode.choices)
    bank = models.CharField(max_length=10, blank=True)
    nomor_va = models.CharField(max_length=24, blank=True)
    batas_bayar = models.DateTimeField()
    dibuat = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-dibuat"]
        verbose_name_plural = "pesanan"

    def __str__(self):
        return self.nomor


class ItemPesanan(models.Model):
    pesanan = models.ForeignKey(Pesanan, on_delete=models.CASCADE, related_name="item")
    varian = models.ForeignKey("catalog.Varian", on_delete=models.PROTECT, related_name="+")
    # Snapshot, agar riwayat tidak berubah bila produk diedit.
    nama = models.CharField(max_length=140)
    slug = models.SlugField(max_length=160)
    motif = models.SlugField()
    bentuk = models.SlugField()
    warna = models.CharField(max_length=10)
    ukuran = models.CharField(max_length=3)
    sku = models.CharField(max_length=40)
    harga = models.PositiveIntegerField()
    jumlah = models.PositiveIntegerField()

    @property
    def subtotal(self):
        return self.harga * self.jumlah
