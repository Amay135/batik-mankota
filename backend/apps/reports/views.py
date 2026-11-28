from drf_spectacular.utils import extend_schema
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import IsAdmin

from . import selectors
from .serializers import RingkasanDasborSerializer


class RingkasanView(APIView):
    permission_classes = [IsAdmin]

    @extend_schema(responses=RingkasanDasborSerializer)
    def get(self, request):
        return Response(RingkasanDasborSerializer(selectors.ringkasan_admin()).data)
