from django.urls import path

from . import views

urlpatterns = [
    path("csrf/", views.CsrfView.as_view()),
    path("daftar/", views.RegisterView.as_view()),
    path("masuk/", views.LoginView.as_view()),
    path("keluar/", views.LogoutView.as_view()),
    path("saya/", views.MeView.as_view()),
]
