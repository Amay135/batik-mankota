from django.db import models


class Kategori(models.Model):
    nama = models.CharField(max_length=60)
    slug = models.SlugField(unique=True)
    label_pendek = models.CharField(max_length=30, help_text="Dipakai di kartu produk, mis. Pria")
    urutan = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ["urutan", "id"]
        verbose_name_plural = "kategori"

    def __str__(self):
        return self.nama


class Produk(models.Model):
    class Teknik(models.TextChoices):
        TULIS = "tulis", "Batik Tulis"
        CAP = "cap", "Batik Cap"
        KOMBINASI = "kombinasi", "Kombinasi"

    class Warna(models.TextChoices):
        INDIGO = "indigo", "Indigo"
        SOGA = "soga", "Soga"
        KREM = "krem", "Krem"
        HITAM = "hitam", "Hitam"

    nama = models.CharField(max_length=140)
    slug = models.SlugField(unique=True, max_length=160)
    kategori = models.ForeignKey(Kategori, on_delete=models.PROTECT, related_name="produk")
    teknik = models.CharField(max_length=12, choices=Teknik.choices)
    motif = models.SlugField(help_text="parang, kawung, truntum, sekar-jagad, mega-mendung")
    bentuk = models.SlugField(help_text="kemeja, blus, dress, rok, outer, kain, selendang, pouch")
    warna_utama = models.CharField(max_length=10, choices=Warna.choices)
    koleksi = models.CharField(max_length=80, blank=True)
    perajin = models.CharField(max_length=80, blank=True)
    deskripsi = models.TextField(blank=True)
    bahan_detail = models.TextField(blank=True)
    perawatan = models.TextField(blank=True)
    cerita_judul = models.CharField(max_length=120, blank=True)
    cerita_isi = models.TextField(blank=True)
    harga = models.PositiveIntegerField(help_text="Rupiah, tanpa desimal")
    rating = models.DecimalField(max_digits=2, decimal_places=1, default=0)
    jumlah_ulasan = models.PositiveIntegerField(default=0)
    terjual = models.PositiveIntegerField(default=0)
    unggulan = models.BooleanField(default=False, help_text="Tampil dengan lencana Pilihan Mankota")
    aktif = models.BooleanField(default=True)
    dibuat = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-terjual", "id"]
        verbose_name_plural = "produk"

    def __str__(self):
        return self.nama

    @property
    def teknik_label(self):
        return self.get_teknik_display()

    @property
    def label(self):
        teknik = "Kombinasi" if self.teknik == self.Teknik.KOMBINASI else f"Batik {self.teknik}"
        return f"{self.kategori.label_pendek} · {teknik}"


class Varian(models.Model):
    class Ukuran(models.TextChoices):
        S = "S", "S"
        M = "M", "M"
        L = "L", "L"
        XL = "XL", "XL"
        XXL = "XXL", "XXL"
        ALL = "ALL", "Satu ukuran"

    produk = models.ForeignKey(Produk, on_delete=models.CASCADE, related_name="varian")
    warna = models.CharField(max_length=10, choices=Produk.Warna.choices)
    ukuran = models.CharField(max_length=3, choices=Ukuran.choices)
    sku = models.CharField(max_length=40, unique=True)
    # Sementara stok disimpan di sini; modul inventory kelak menjadi sumber tunggal.
    stok = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["id"]
        constraints = [
            models.UniqueConstraint(fields=["produk", "warna", "ukuran"], name="varian_unik"),
        ]
        verbose_name_plural = "varian"

    def __str__(self):
        return self.sku


class FotoProduk(models.Model):
    class Jenis(models.TextChoices):
        DEPAN = "depan", "Tampak depan"
        DETAIL = "detail", "Detail motif"
        BELAKANG = "belakang", "Tampak belakang"
        MODEL = "model", "Dikenakan"

    produk = models.ForeignKey(Produk, on_delete=models.CASCADE, related_name="foto")
    jenis = models.CharField(max_length=10, choices=Jenis.choices, default=Jenis.DEPAN)
    gambar = models.ImageField(
        upload_to="produk/", blank=True, null=True,
        help_text="Kosongkan untuk memakai ilustrasi motif otomatis",
    )
    urutan = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ["urutan", "id"]
        verbose_name_plural = "foto produk"
