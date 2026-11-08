from io import BytesIO
from uuid import uuid4

from django.core.cache import cache
from django.core.files.base import ContentFile
from PIL import Image, UnidentifiedImageError
from rest_framework.exceptions import ValidationError

from apps.audit.models import AuditLog
from apps.audit.services import catat

from .models import FotoProduk

BATAS_FOTO_BYTE = 5 * 1024 * 1024
FORMAT_FOTO = {"JPEG": ".jpg", "PNG": ".png", "WEBP": ".webp"}
SISI_MAKS_FOTO = 1600
KUNCI_VERSI_KATALOG = "katalog:versi"


def versi_katalog() -> int:
    return cache.get(KUNCI_VERSI_KATALOG, 0)


def segarkan_katalog() -> None:
    """Naikkan versi cache; semua respons tamu lama otomatis tidak terpakai."""
    cache.set(KUNCI_VERSI_KATALOG, versi_katalog() + 1, timeout=None)


def catat_perubahan_harga_produk(*, actor, produk, harga_lama, ip=None):
    if produk.harga == harga_lama:
        return
    catat(
        actor=actor,
        action=AuditLog.Action.PRICE_CHANGE,
        entity="produk",
        entity_id=produk.pk,
        before={"harga": harga_lama},
        after={"harga": produk.harga},
        ip=ip,
    )


def catat_perubahan_harga_beli(*, actor, varian, harga_lama, ip=None):
    if varian.harga_beli == harga_lama:
        return
    catat(
        actor=actor,
        action=AuditLog.Action.PRICE_CHANGE,
        entity="varian",
        entity_id=varian.pk,
        before={"harga_beli": harga_lama},
        after={"harga_beli": varian.harga_beli},
        ip=ip,
    )


def simpan_foto(*, produk, berkas, jenis=FotoProduk.Jenis.DEPAN, alt="", urutan=0):
    """Validasi jenis/ukuran, proses ulang dengan Pillow, simpan dengan nama acak."""
    if berkas.size > BATAS_FOTO_BYTE:
        raise ValidationError({"gambar": ["Ukuran foto maksimal 5 MB."]})
    try:
        with Image.open(berkas) as gambar:
            format_ = gambar.format
            gambar.verify()
    except (UnidentifiedImageError, OSError):
        raise ValidationError({"gambar": ["Berkas bukan gambar yang valid."]})
    if format_ not in FORMAT_FOTO:
        raise ValidationError({"gambar": ["Format foto harus JPEG, PNG, atau WEBP."]})

    berkas.seek(0)
    with Image.open(berkas) as gambar:
        gambar.load()
        gambar.thumbnail((SISI_MAKS_FOTO, SISI_MAKS_FOTO))
        if format_ == "JPEG" and gambar.mode != "RGB":
            gambar = gambar.convert("RGB")
        buffer = BytesIO()
        gambar.save(buffer, format=format_)

    nama = f"produk/{uuid4().hex}{FORMAT_FOTO[format_]}"
    return FotoProduk.objects.create(
        produk=produk,
        jenis=jenis,
        alt=alt,
        urutan=urutan,
        gambar=ContentFile(buffer.getvalue(), name=nama),
    )
