from drf_spectacular.utils import extend_schema
from rest_framework.generics import ListAPIView
from rest_framework.pagination import PageNumberPagination

from apps.accounts.permissions import IsAdmin

from .models import AuditLog
from .serializers import AuditLogSerializer, FilterAuditSerializer


class AuditPagination(PageNumberPagination):
    page_size = 50


@extend_schema(parameters=[FilterAuditSerializer])
class AuditLogListView(ListAPIView):
    permission_classes = [IsAdmin]
    serializer_class = AuditLogSerializer
    pagination_class = AuditPagination
    queryset = AuditLog.objects.select_related("actor")

    def get_queryset(self):
        qs = super().get_queryset()
        f = FilterAuditSerializer(data=self.request.query_params)
        f.is_valid(raise_exception=True)
        p = f.validated_data

        if dari := p.get("dari"):
            qs = qs.filter(created_at__date__gte=dari)
        if sampai := p.get("sampai"):
            qs = qs.filter(created_at__date__lte=sampai)
        if pelaku := p.get("pelaku"):
            qs = qs.filter(actor__email__icontains=pelaku)
        if aksi := p.get("aksi"):
            qs = qs.filter(action=aksi)
        return qs
