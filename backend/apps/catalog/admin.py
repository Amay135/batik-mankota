from django.contrib import admin

from .models import FotoProduk, Kategori, Produk, Varian


class VarianInline(admin.TabularInline):
    model = Varian
    extra = 0


class FotoInline(admin.TabularInline):
    model = FotoProduk
    extra = 0


@admin.register(Kategori)
class KategoriAdmin(admin.ModelAdmin):
    list_display = ("nama", "slug", "urutan")
    prepopulated_fields = {"slug": ("nama",)}


@admin.register(Produk)
class ProdukAdmin(admin.ModelAdmin):
    list_display = ("nama", "kategori", "teknik", "harga", "terjual", "unggulan", "aktif")
    list_filter = ("kategori", "teknik", "aktif", "unggulan")
    search_fields = ("nama", "slug")
    prepopulated_fields = {"slug": ("nama",)}
    inlines = [VarianInline, FotoInline]
