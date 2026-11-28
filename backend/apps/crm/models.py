from django.db import models


class Pelanggan(models.Model):
    """Pelanggan toko. Bukan member: tanpa tier, poin, atau benefit khusus."""

    nama = models.CharField(max_length=120)
    telepon = models.CharField(max_length=20, blank=True)
    email = models.EmailField(blank=True)
    alamat = models.TextField(blank=True)
    catatan = models.TextField(blank=True)
    dibuat = models.DateTimeField(auto_now_add=True)
    diperbarui = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["nama", "id"]
        verbose_name_plural = "pelanggan"
        constraints = [
            # Nama boleh sama; telepon jadi kunci identitas bila diisi.
            models.UniqueConstraint(
                fields=["telepon"],
                condition=~models.Q(telepon=""),
                name="pelanggan_telepon_unik",
            ),
        ]

    def __str__(self):
        return self.nama
