from django.db.models.signals import post_delete, post_save

from apps.inventory.models import Stock

from . import services
from .models import (
    FotoProduk,
    Kategori,
    Motif,
    PanduanUkuran,
    Produk,
    Ulasan,
    Varian,
)

_MODEL_KATALOG = (
    Produk,
    Varian,
    FotoProduk,
    Kategori,
    Motif,
    Stock,
    Ulasan,
    PanduanUkuran,
)


def _segarkan(sender, **kwargs):
    services.segarkan_katalog()


for _model in _MODEL_KATALOG:
    for _nama, _signal in (("save", post_save), ("delete", post_delete)):
        _signal.connect(
            _segarkan,
            sender=_model,
            dispatch_uid=f"katalog-cache-{_model._meta.label}-{_nama}",
        )
