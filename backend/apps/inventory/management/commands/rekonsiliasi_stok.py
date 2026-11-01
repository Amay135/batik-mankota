from django.core.management.base import BaseCommand, CommandError
from django.db.models import Sum, Value
from django.db.models.functions import Coalesce

from apps.inventory.models import Stock


class Command(BaseCommand):
    help = "Periksa apakah total ledger stok sama dengan qty_on_hand"

    def handle(self, *args, **options):
        daftar = list(
            Stock.objects.select_related("variant").annotate(
                total_ledger=Coalesce(
                    Sum("variant__stock_movements__qty_delta"), Value(0)
                )
            )
        )
        selisih = [stock for stock in daftar if stock.total_ledger != stock.qty_on_hand]
        if not selisih:
            self.stdout.write(
                self.style.SUCCESS(
                    f"Rekonsiliasi stok cocok untuk {len(daftar)} varian."
                )
            )
            return

        for stock in selisih:
            self.stdout.write(
                self.style.ERROR(
                    f"{stock.variant.sku}: ledger={stock.total_ledger}, "
                    f"on_hand={stock.qty_on_hand}, "
                    f"selisih={stock.qty_on_hand - stock.total_ledger}"
                )
            )
        raise CommandError(f"{len(selisih)} varian tidak cocok.")
