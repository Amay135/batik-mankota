from django.db.models import Sum
from django.utils import timezone

from apps.audit.models import AuditLog
from apps.inventory.selectors import hitung_stok_menipis_habis
from apps.orders.models import ItemPesanan, Pesanan

# Status pesanan yang sudah dibayar atau sesudahnya. Pesanan menunggu/batal
# bukan penjualan.
STATUS_TERJUAL = (
    Pesanan.Status.DIBAYAR,
    Pesanan.Status.DIPROSES,
    Pesanan.Status.DIKIRIM,
    Pesanan.Status.SELESAI,
)
JUMLAH_AKTIVITAS = 5


def ringkasan_admin():
    """KPI dashboard admin dari database. Tidak memakai snapshot HPP."""
    hari = timezone.localdate()  # Asia/Jakarta (settings.TIME_ZONE)
    pesanan_hari = Pesanan.objects.filter(dibuat__date=hari)
    pesanan_terjual = pesanan_hari.filter(status__in=STATUS_TERJUAL)

    stok = hitung_stok_menipis_habis()

    return {
        "tanggal": hari,
        "penjualan_hari_ini": pesanan_terjual.aggregate(total=Sum("total"))["total"]
        or 0,
        # Semua pesanan yang dibuat hari ini, termasuk yang belum dibayar.
        "pesanan_hari_ini": pesanan_hari.count(),
        "pesanan_menunggu_pembayaran": Pesanan.objects.filter(
            status=Pesanan.Status.MENUNGGU
        ).count(),
        "produk_terjual_hari_ini": ItemPesanan.objects.filter(
            pesanan__dibuat__date=hari, pesanan__status__in=STATUS_TERJUAL
        ).aggregate(total=Sum("jumlah"))["total"]
        or 0,
        # Menipis dan habis dipisah agar tidak dihitung dua kali.
        "varian_stok_menipis": stok["menipis"],
        "varian_stok_habis": stok["habis"],
        "aktivitas": AuditLog.objects.select_related("actor").order_by(
            "-created_at", "-id"
        )[:JUMLAH_AKTIVITAS],
    }
