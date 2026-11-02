class InsufficientStock(Exception):
    """Stok tersedia tidak mencukupi; pesan tidak memuat angka stok."""

    def __init__(self, variant_id=None):
        self.variant_id = variant_id
        super().__init__("Stok tidak mencukupi.")


class OpnameSudahDiterapkan(Exception):
    """Sesi opname hanya boleh diterapkan sekali."""

    def __init__(self):
        super().__init__("Opname sudah diterapkan.")
