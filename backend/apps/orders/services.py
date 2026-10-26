import secrets
from datetime import timedelta

from django.conf import settings
from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from apps.catalog.models import Varian

from .models import ItemKeranjang, ItemPesanan, Keranjang, Pesanan

BANK_PREFIX = {"bca": "39", "bni": "8808", "mandiri": "8860", "bri": "26215"}


def keranjang_user(user):
    k, _ = Keranjang.objects.get_or_create(user=user)
    return k


def item_keranjang(keranjang):
    return list(
        keranjang.item.select_related("varian__produk__kategori").prefetch_related("varian__produk__foto")
    )


def hitung_ringkasan(items, voucher=None):
    subtotal = sum(i.varian.produk.harga * i.jumlah for i in items)
    ongkir = settings.ONGKIR_FLAT if items else 0
    promo = ongkir if subtotal >= settings.GRATIS_ONGKIR_MIN else 0
    diskon, voucher_error = 0, None
    if voucher:
        voucher_error = voucher.cek(subtotal)
        if not voucher_error:
            diskon = voucher.hitung(subtotal)
    total = subtotal + ongkir - promo - diskon
    return {
        "jumlah_produk": len(items),
        "jumlah_barang": sum(i.jumlah for i in items),
        "subtotal": subtotal,
        "ongkir": ongkir,
        "promo_ongkir": promo,
        "diskon_voucher": diskon,
        "kode_voucher": voucher.kode if voucher and not voucher_error else "",
        "voucher_galat": voucher_error,
        "total": total,
        "gratis_ongkir_min": settings.GRATIS_ONGKIR_MIN,
    }


def _nomor_unik():
    while True:
        nomor = f"MK-{timezone.localdate():%y%m%d}-{secrets.randbelow(10**5):05d}"
        if not Pesanan.objects.filter(nomor=nomor).exists():
            return nomor


@transaction.atomic
def buat_pesanan(user, data):
    keranjang = keranjang_user(user)
    items = list(ItemKeranjang.objects.filter(keranjang=keranjang).order_by("varian_id"))
    if not items:
        raise ValidationError({"detail": "Keranjang masih kosong."})

    # Kunci baris varian (urut by id) agar dua checkout bersamaan tidak oversell.
    varian = {
        v.id: v
        for v in Varian.objects.select_for_update()
        .select_related("produk")
        .filter(id__in=[i.varian_id for i in items])
        .order_by("id")
    }
    for i in items:
        v = varian[i.varian_id]
        if not v.produk.aktif or v.stok < i.jumlah:
            raise ValidationError({"detail": f"Stok {v.produk.nama} ({v.warna}/{v.ukuran}) tidak mencukupi."})
        i.varian = v

    r = hitung_ringkasan(items, keranjang.voucher)
    pesanan = Pesanan.objects.create(
        nomor=_nomor_unik(),
        user=user,
        nama_lengkap=data["nama_lengkap"],
        whatsapp=data["whatsapp"],
        email=data["email"],
        alamat=data["alamat"],
        provinsi=data["provinsi"],
        kota=data["kota"],
        kecamatan=data["kecamatan"],
        kode_pos=data["kode_pos"],
        voucher_kode=r["kode_voucher"],
        subtotal=r["subtotal"],
        ongkir=r["ongkir"],
        promo_ongkir=r["promo_ongkir"],
        diskon=r["diskon_voucher"],
        total=r["total"],
        metode_bayar=data["metode_bayar"],
        bank=data.get("bank", ""),
        batas_bayar=timezone.now() + timedelta(hours=settings.BATAS_BAYAR_JAM),
    )
    # Nomor VA simulasi; diganti respons payment gateway (Midtrans/Xendit) nanti.
    if pesanan.metode_bayar == Pesanan.Metode.TRANSFER:
        prefix = BANK_PREFIX.get(pesanan.bank, "88")
        pesanan.nomor_va = f"{prefix}{pesanan.pk:08d}{secrets.randbelow(10**3):03d}"
        pesanan.save(update_fields=["nomor_va"])

    for i in items:
        v, p = i.varian, i.varian.produk
        ItemPesanan.objects.create(
            pesanan=pesanan, varian=v, nama=p.nama, slug=p.slug, motif=p.motif, bentuk=p.bentuk,
            warna=v.warna, ukuran=v.ukuran, sku=v.sku, harga=p.harga, jumlah=i.jumlah,
        )
        v.stok -= i.jumlah
        v.save(update_fields=["stok"])

    keranjang.item.all().delete()
    keranjang.voucher = None
    keranjang.save(update_fields=["voucher"])
    return pesanan
