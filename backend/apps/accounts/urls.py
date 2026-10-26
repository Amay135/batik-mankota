from django.urls import path

from . import views

urlpatterns = [
    path("csrf/", views.CsrfView.as_view()),
    path("daftar/", views.RegisterView.as_view()),
    path("masuk/", views.LoginView.as_view()),
    path("keluar/", views.LogoutView.as_view()),
    path("saya/", views.MeView.as_view()),
    path("akun/", views.AkunListView.as_view()),
    path("akun/<int:pk>/", views.AkunDetailView.as_view()),
    path("akun/<int:pk>/reset-password/", views.ResetPasswordView.as_view()),
    path("2fa/setup/", views.OtpSetupView.as_view()),
    path("2fa/verify/", views.OtpVerifyView.as_view()),
]
