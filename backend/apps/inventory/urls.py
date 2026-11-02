from django.urls import path

from . import views

urlpatterns = [
    path("", views.StokListView.as_view()),
    path("menipis/", views.StokMenipisView.as_view()),
    path("mutasi/", views.MutasiListView.as_view()),
    path("<int:pk>/minimum/", views.MinimumStokView.as_view()),
    path("penyesuaian/", views.PenyesuaianCreateView.as_view()),
    path("opname/", views.OpnameCreateView.as_view()),
    path("opname/<int:pk>/", views.OpnameDetailView.as_view()),
    path("opname/<int:pk>/terapkan/", views.OpnameTerapkanView.as_view()),
]
