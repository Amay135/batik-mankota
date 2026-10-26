from django.contrib import admin

from .models import ItemPesanan, Pesanan, Voucher


class ItemPesananInline(admin.TabularInline):
    model = ItemPesanan
    extra = 0
    readonly_fields = ("varian",)


@admin.register(Pesanan)
class PesananAdmin(admin.ModelAdmin):
    list_display = ("nomor", "nama_lengkap", "status", "total", "metode_bayar", "dibuat")
    list_filter = ("status", "metode_bayar")
    search_fields = ("nomor", "nama_lengkap", "email")
    inlines = [ItemPesananInline]


admin.site.register(Voucher)
