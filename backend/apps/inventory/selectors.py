from django.db.models import F

from .models import Stock

AMBANG_STOK_SEDIKIT = 5


def available_qty(stock: Stock) -> int:
    return stock.qty_on_hand - stock.qty_reserved


def available_for_variant(varian) -> int:
    """Stok tersedia untuk satu varian; 0 bila baris Stock belum ada."""
    stock = getattr(varian, "stock", None)
    return available_qty(stock) if stock else 0


def available_stocks(*, ukuran=(), warna=()):
    """Baris Stock yang tersedia, untuk filter katalog tanpa menyentuh qty_*."""
    qs = Stock.objects.filter(qty_on_hand__gt=F("qty_reserved"))
    if ukuran:
        qs = qs.filter(variant__ukuran__in=ukuran)
    if warna:
        qs = qs.filter(variant__warna__in=warna)
    return qs


def stock_status(stock: Stock) -> str:
    """Label PRD 5.10; min_stock disimpan untuk peringatan restock, bukan label."""
    tersedia = available_qty(stock)
    if tersedia <= 0:
        return "Habis"
    if tersedia <= AMBANG_STOK_SEDIKIT:
        return "Tinggal sedikit"
    return "Tersedia"
