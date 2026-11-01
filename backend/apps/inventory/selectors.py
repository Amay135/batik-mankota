from .models import Stock

AMBANG_STOK_SEDIKIT = 5


def available_qty(stock: Stock) -> int:
    return stock.qty_on_hand - stock.qty_reserved


def stock_status(stock: Stock) -> str:
    """Label PRD 5.10; min_stock disimpan untuk peringatan restock, bukan label."""
    tersedia = available_qty(stock)
    if tersedia <= 0:
        return "Habis"
    if tersedia <= AMBANG_STOK_SEDIKIT:
        return "Tinggal sedikit"
    return "Tersedia"
