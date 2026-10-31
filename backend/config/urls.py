from django.conf import settings
from django.conf.urls.static import static
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView

from apps.accounts.permissions import SchemaPermission

urlpatterns = [
    path(
        "api/schema/",
        SpectacularAPIView.as_view(permission_classes=[SchemaPermission]),
        name="schema",
    ),
    path("api/v1/auth/", include("apps.accounts.urls")),
    path("api/v1/audit/", include("apps.audit.urls")),
    path("api/v1/katalog/", include("apps.catalog.urls")),
    path("api/v1/", include("apps.orders.urls")),
]
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
