from django.urls import path

from . import views

urlpatterns = [
    path("kategori/", views.KategoriListView.as_view()),
    path("produk/", views.ProdukListView.as_view()),
    path("produk/<slug:slug>/", views.ProdukDetailView.as_view()),
]
