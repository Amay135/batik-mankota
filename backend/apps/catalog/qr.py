"""QR varian dan label cetak: satu sumber isi QR untuk gambar maupun PDF."""

from io import BytesIO

import qrcode
import qrcode.image.svg
from django.conf import settings
from django.core.cache import cache
from reportlab.lib.units import mm
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase.pdfmetrics import stringWidth
from reportlab.pdfgen import canvas
from rest_framework.exceptions import ValidationError

UKURAN_LABEL = {
    "40x30": (40 * mm, 30 * mm),
    "58x40": (58 * mm, 40 * mm),
}
# Cukup untuk satu produk (maks. 6 varian) kali 100 salinan, tetap membatasi PDF raksasa.
BATAS_HALAMAN = 500

GAYA = {
    "40x30": {"qr": 16 * mm, "nama": 5, "kecil": 4.5, "harga": 6.5},
    "58x40": {"qr": 24 * mm, "nama": 7, "kecil": 6, "harga": 9},
}


def qr_content(varian) -> str:
    return f"{settings.SITE_URL.rstrip('/')}/q/{varian.qr_token}"


def _qr_bytes(varian, gambar_format: str) -> bytes:
    isi = qr_content(varian)
    # Key memuat isi QR, jadi ganti SITE_URL otomatis tidak memakai cache lama.
    key = f"qr:{gambar_format}:{isi}"
    data = cache.get(key)
    if data is None:
        if gambar_format == "svg":
            gambar = qrcode.make(isi, image_factory=qrcode.image.svg.SvgPathImage)
        else:
            gambar = qrcode.make(isi)
        buffer = BytesIO()
        gambar.save(buffer)
        data = buffer.getvalue()
        cache.set(key, data, timeout=None)
    return data


def qr_svg(varian) -> bytes:
    return _qr_bytes(varian, "svg")


def qr_png(varian) -> bytes:
    return _qr_bytes(varian, "png")


def _rupiah(nilai: int) -> str:
    return f"Rp{nilai:,}".replace(",", ".")


def _baris(teks: str, font: str, ukuran: float, lebar: float) -> list[str]:
    hasil, sekarang = [], ""
    for kata in teks.split():
        coba = f"{sekarang} {kata}".strip()
        if not sekarang or stringWidth(coba, font, ukuran) <= lebar:
            sekarang = coba
        else:
            hasil.append(sekarang)
            sekarang = kata
    if sekarang:
        hasil.append(sekarang)
    return hasil


def _halaman(c: canvas.Canvas, varian, gambar, ukuran: str):
    w, h = UKURAN_LABEL[ukuran]
    gaya = GAYA[ukuran]
    pad = 2 * mm
    qr = gaya["qr"]
    c.drawImage(gambar, pad, (h - qr) / 2, qr, qr)

    x = pad + qr + 1.5 * mm
    lebar = w - x - pad
    y = h - pad - gaya["nama"]

    nama = _baris(varian.produk.nama, "Helvetica-Bold", gaya["nama"], lebar)
    if len(nama) > 2:
        nama = nama[:2]
        nama[1] = nama[1][:-1] + "…"
    c.setFont("Helvetica-Bold", gaya["nama"])
    for baris in nama:
        c.drawString(x, y, baris)
        y -= gaya["nama"] * 1.25

    c.setFont("Helvetica", gaya["kecil"])
    for teks in (varian.sku, f"Ukuran {varian.get_ukuran_display()}"):
        c.drawString(x, y, teks)
        y -= gaya["kecil"] * 1.35

    c.setFont("Helvetica-Bold", gaya["harga"])
    c.drawString(x, y, _rupiah(varian.produk.harga))


def render_label_pdf(*, ukuran: str, items) -> bytes:
    """items: iterable (varian, salinan); satu salinan = satu halaman."""
    if ukuran not in UKURAN_LABEL:
        raise ValidationError({"ukuran": ["Ukuran label tidak dikenal."]})
    total = sum(salinan for _, salinan in items)
    if total > BATAS_HALAMAN:
        raise ValidationError(
            {"varian": [f"Maksimal {BATAS_HALAMAN} label per cetak."]}
        )

    buffer = BytesIO()
    # Tanpa kompresi: label kecil, dan teks bisa diperiksa langsung (mis. harga beli tidak bocor).
    c = canvas.Canvas(buffer, pagesize=UKURAN_LABEL[ukuran], pageCompression=0)
    for varian, salinan in items:
        png = qr_png(varian)
        for _ in range(salinan):
            _halaman(c, varian, ImageReader(BytesIO(png)), ukuran)
            c.showPage()
    c.save()
    return buffer.getvalue()
