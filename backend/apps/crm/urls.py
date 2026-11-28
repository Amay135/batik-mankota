from django.urls import path

from . import views

urlpatterns = [
    path("", views.PelangganListCreateView.as_view()),
    path("ringkasan/", views.RingkasanPelangganView.as_view()),
    path("<int:pk>/", views.PelangganDetailView.as_view()),
    path("<int:pk>/pesanan/", views.RiwayatPesananView.as_view()),
]
