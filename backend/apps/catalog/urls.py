from django.urls import path

from . import views

urlpatterns = [
    path("kategori/", views.KategoriListView.as_view()),
    path("motif/", views.MotifListView.as_view()),
    path("produk/", views.ProdukListView.as_view()),
    path("produk/<slug:slug>/", views.ProdukDetailView.as_view()),
    path("produk/<slug:slug>/ulasan/", views.UlasanTulisView.as_view()),
    path("ulasan/<int:pk>/", views.UlasanSendiriView.as_view()),
    # Pengelolaan katalog (admin + 2FA). Rute terpisah agar path publik tetap AllowAny-free.
    path("kelola/kategori/", views.KategoriAdminListCreateView.as_view()),
    path("kelola/kategori/<int:pk>/", views.KategoriAdminDetailView.as_view()),
    path("kelola/motif/", views.MotifAdminListCreateView.as_view()),
    path("kelola/motif/<int:pk>/", views.MotifAdminDetailView.as_view()),
    path("kelola/produk/", views.ProdukAdminListCreateView.as_view()),
    path("kelola/produk/<int:pk>/", views.ProdukAdminDetailView.as_view()),
    path("kelola/produk/<int:pk>/varian/", views.VarianAdminListCreateView.as_view()),
    path("kelola/produk/<int:pk>/foto/", views.FotoAdminCreateView.as_view()),
    path("kelola/varian/<int:pk>/", views.VarianAdminDetailView.as_view()),
    path("kelola/foto/<int:pk>/", views.FotoAdminDetailView.as_view()),
    path("kelola/ulasan/", views.UlasanAdminListView.as_view()),
    path("kelola/ulasan/<int:pk>/", views.UlasanAdminDetailView.as_view()),
    path("kelola/panduan-ukuran/", views.PanduanUkuranAdminListCreateView.as_view()),
    path(
        "kelola/panduan-ukuran/<int:pk>/",
        views.PanduanUkuranAdminDetailView.as_view(),
    ),
    path("varian/<int:pk>/qr/", views.QrGambarView.as_view()),
    path("label/", views.LabelCetakView.as_view()),
]
