from django.urls import path

from . import views

urlpatterns = [
    path("keranjang/", views.KeranjangView.as_view()),
    path("keranjang/item/", views.TambahItemView.as_view()),
    path("keranjang/item/<int:pk>/", views.ItemView.as_view()),
    path("keranjang/voucher/", views.VoucherView.as_view()),
    path("pesanan/", views.PesananListCreateView.as_view()),
    path("pesanan/<str:nomor>/", views.PesananDetailView.as_view()),
]
