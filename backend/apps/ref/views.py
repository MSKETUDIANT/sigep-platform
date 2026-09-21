from rest_framework import permissions, viewsets

from apps.core.permissions import LectureAuthentifieEcritureSuperAdmin

from .models import Classe, Commune, Cycle, Prefecture, Quartier, Region, SousPrefecture
from .serializers import (
    ClasseSerializer,
    CommuneSerializer,
    CycleSerializer,
    PrefectureSerializer,
    QuartierSerializer,
    RegionSerializer,
    SousPrefectureSerializer,
)


class RegionViewSet(viewsets.ModelViewSet):
    queryset = Region.objects.all()
    serializer_class = RegionSerializer
    permission_classes = [LectureAuthentifieEcritureSuperAdmin]
    search_fields = ["nom", "code"]
    filterset_fields = ["actif", "type_zone"]
    ordering_fields = ["nom", "code"]


class PrefectureViewSet(viewsets.ModelViewSet):
    queryset = Prefecture.objects.select_related("region").all()
    serializer_class = PrefectureSerializer
    permission_classes = [LectureAuthentifieEcritureSuperAdmin]
    search_fields = ["nom", "code"]
    filterset_fields = ["region", "actif"]
    ordering_fields = ["nom", "code"]


class SousPrefectureViewSet(viewsets.ModelViewSet):
    """US-1.3 (création, code auto) + US-1.7 (statut filtrable)."""

    queryset = SousPrefecture.objects.select_related("prefecture", "prefecture__region").all()
    serializer_class = SousPrefectureSerializer
    permission_classes = [LectureAuthentifieEcritureSuperAdmin]
    search_fields = ["nom", "code"]
    filterset_fields = ["statut", "prefecture"]
    ordering_fields = ["nom", "code"]


class CommuneViewSet(viewsets.ModelViewSet):
    queryset = Commune.objects.select_related("region", "prefecture").all()
    serializer_class = CommuneSerializer
    permission_classes = [LectureAuthentifieEcritureSuperAdmin]
    search_fields = ["nom", "code"]
    filterset_fields = ["region", "actif"]
    ordering_fields = ["nom", "code"]


class QuartierViewSet(viewsets.ModelViewSet):
    """US-1.5 (création, code auto) + US-1.7 (statut filtrable)."""

    queryset = Quartier.objects.select_related("commune").all()
    serializer_class = QuartierSerializer
    permission_classes = [LectureAuthentifieEcritureSuperAdmin]
    search_fields = ["nom", "code"]
    filterset_fields = ["statut", "commune"]
    ordering_fields = ["nom", "code"]


class CycleViewSet(viewsets.ReadOnlyModelViewSet):
    """Référentiel fixe (§14.1) — pas de création/modification via l'API."""

    queryset = Cycle.objects.all()
    serializer_class = CycleSerializer
    permission_classes = [permissions.IsAuthenticated]


class ClasseViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Classe.objects.select_related("cycle").all()
    serializer_class = ClasseSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["cycle"]
