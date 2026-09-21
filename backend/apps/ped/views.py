from rest_framework import viewsets

from apps.core.permissions import LectureAuthentifieEcritureSuperAdmin
from apps.org.services import ecoles_visibles

from .models import Eleve, Filiation
from .serializers import EleveSerializer, FiliationSerializer


class EleveViewSet(viewsets.ModelViewSet):
    """US-4.3 (création) et US-4.5 (liste bornée au périmètre)."""

    serializer_class = EleveSerializer
    permission_classes = [LectureAuthentifieEcritureSuperAdmin]
    search_fields = ["matricule", "nom", "prenoms"]
    filterset_fields = ["ecole", "classe", "statut", "sexe"]

    def get_queryset(self):
        return (
            Eleve.objects.select_related("ecole", "classe")
            .prefetch_related("filiations")
            .filter(ecole__in=ecoles_visibles(self.request.user))
        )


class FiliationViewSet(viewsets.ModelViewSet):
    serializer_class = FiliationSerializer
    permission_classes = [LectureAuthentifieEcritureSuperAdmin]
    filterset_fields = ["eleve", "lien"]

    def get_queryset(self):
        return Filiation.objects.select_related("eleve").filter(
            eleve__ecole__in=ecoles_visibles(self.request.user)
        )
