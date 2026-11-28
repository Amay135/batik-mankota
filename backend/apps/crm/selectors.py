from django.db.models import Count, Max, Q, Sum
from django.db.models.functions import Coalesce

from apps.orders.models import Pesanan

from .models import Pelanggan

# Status yang dihitung sebagai pembelian, sama dengan laporan penjualan
# (apps/reports/selectors.py). Menunggu bayar dan batal tidak dihitung.
STATUS_BERHASIL = (
    Pesanan.Status.DIBAYAR,
    Pesanan.Status.DIPROSES,
    Pesanan.Status.DIKIRIM,
    Pesanan.Status.SELESAI,
)
FILTER_BERHASIL = Q(pesanan__status__in=STATUS_BERHASIL)


def pelanggan_dengan_statistik():
    """Pelanggan + statistik pesanan berhasil; semua agregat memakai filter yang sama."""
    return Pelanggan.objects.annotate(
        jumlah_transaksi=Count("pesanan", filter=FILTER_BERHASIL),
        total_belanja=Coalesce(Sum("pesanan__total", filter=FILTER_BERHASIL), 0),
        terakhir_belanja=Max("pesanan__dibuat", filter=FILTER_BERHASIL),
    )


def statistik_pelanggan(pelanggan: Pelanggan) -> dict:
    pesanan = Pesanan.objects.filter(pelanggan=pelanggan)
    berhasil = pesanan.filter(status__in=STATUS_BERHASIL)
    agg = berhasil.aggregate(total=Sum("total"), terakhir=Max("dibuat"))
    jumlah = berhasil.count()
    total = agg["total"] or 0
    return {
        "jumlah_transaksi": jumlah,
        "total_belanja": total,
        # Rupiah integer; pembagian bulat disengaja (tanpa float).
        "rata_rata_transaksi": total // jumlah if jumlah else 0,
        "transaksi_selesai": pesanan.filter(status=Pesanan.Status.SELESAI).count(),
        "terakhir_belanja": agg["terakhir"],
    }


def ringkasan_pelanggan() -> dict:
    berhasil = Pesanan.objects.filter(
        pelanggan__isnull=False, status__in=STATUS_BERHASIL
    )
    return {
        "total_pelanggan": Pelanggan.objects.count(),
        "pelanggan_dengan_transaksi": berhasil.values("pelanggan_id")
        .distinct()
        .count(),
        "total_transaksi": berhasil.count(),
        "total_nilai_transaksi": berhasil.aggregate(total=Sum("total"))["total"] or 0,
    }
