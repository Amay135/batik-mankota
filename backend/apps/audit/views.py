from rest_framework.generics import ListAPIView
from rest_framework.pagination import PageNumberPagination

from apps.accounts.permissions import IsAdmin

from .models import AuditLog
from .serializers import AuditLogSerializer


class AuditPagination(PageNumberPagination):
    page_size = 50


class AuditLogListView(ListAPIView):
    permission_classes = [IsAdmin]
    serializer_class = AuditLogSerializer
    pagination_class = AuditPagination
    queryset = AuditLog.objects.select_related("actor")
