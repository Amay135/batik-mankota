from django.urls import path

from .views import RingkasanView

urlpatterns = [
    path("ringkasan/", RingkasanView.as_view()),
]
