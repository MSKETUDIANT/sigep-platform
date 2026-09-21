from rest_framework import viewsets

from .models import Commune, Prefecture, Quartier, Region, SousPrefecture
from .serializers import (
    CommuneSerializer,
    PrefectureSerializer,
    QuartierSerializer,
    RegionSerializer,
    SousPrefectureSerializer,
)


class RegionViewSet(viewsets.ModelViewSet):
    queryset = Region.objects.all()
    serializer_class = RegionSerializer
    search_fields = ["nom", "code"]
    filterset_fields = ["actif", "type_zone"]
    ordering_fields = ["nom", "code"]


class PrefectureViewSet(viewsets.ModelViewSet):
    queryset = Prefecture.objects.select_related("region").all()
    serializer_class = PrefectureSerializer
    search_fields = ["nom", "code"]
    filterset_fields = ["region", "actif"]
    ordering_fields = ["nom", "code"]


class SousPrefectureViewSet(viewsets.ModelViewSet):
    """US-1.3 (création, code auto) + US-1.7 (statut filtrable)."""

    queryset = SousPrefecture.objects.select_related("prefecture", "prefecture__region").all()
    serializer_class = SousPrefectureSerializer
    search_fields = ["nom", "code"]
    filterset_fields = ["statut", "prefecture"]
    ordering_fields = ["nom", "code"]


class CommuneViewSet(viewsets.ModelViewSet):
    queryset = Commune.objects.select_related("region", "prefecture").all()
    serializer_class = CommuneSerializer
    search_fields = ["nom", "code"]
    filterset_fields = ["region", "actif"]
    ordering_fields = ["nom", "code"]


class QuartierViewSet(viewsets.ModelViewSet):
    """US-1.5 (création, code auto) + US-1.7 (statut filtrable)."""

    queryset = Quartier.objects.select_related("commune").all()
    serializer_class = QuartierSerializer
    search_fields = ["nom", "code"]
    filterset_fields = ["statut", "commune"]
    ordering_fields = ["nom", "code"]
