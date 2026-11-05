from django.urls import path

from . import views

urlpatterns = [
    path("varian/<str:token>/", views.VarianScanView.as_view()),
]
