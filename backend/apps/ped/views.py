from rest_framework.exceptions import PermissionDenied
from rest_framework import viewsets

from apps.core.permissions import LectureAuthentifieEcritureSuperAdminOuDirecteurEcole
from apps.org.services import PROFILS_VUE_NATIONALE, ecoles_visibles

from .models import Eleve, Filiation
from .serializers import EleveSerializer, FiliationSerializer


class EleveViewSet(viewsets.ModelViewSet):
    """US-4.3 (création) et US-4.5 (liste bornée au périmètre). Écriture
    ouverte au Directeur d'École (§6.1/§17), borné à sa propre école : voir
    perform_create/perform_update."""

    serializer_class = EleveSerializer
    permission_classes = [LectureAuthentifieEcritureSuperAdminOuDirecteurEcole]
    search_fields = ["matricule", "nom", "prenoms"]
    filterset_fields = ["ecole", "classe", "statut", "sexe"]

    def get_queryset(self):
        return (
            Eleve.objects.select_related("ecole", "classe")
            .prefetch_related("filiations")
            .filter(ecole__in=ecoles_visibles(self.request.user))
        )

    def _verifier_ecole_dans_perimetre(self, ecole):
        user = self.request.user
        if user.profil in PROFILS_VUE_NATIONALE:
            return
        if not ecole or ecole not in ecoles_visibles(user):
            raise PermissionDenied("Cette école n'est pas dans votre périmètre.")

    def perform_create(self, serializer):
        self._verifier_ecole_dans_perimetre(serializer.validated_data.get("ecole"))
        serializer.save()

    def perform_update(self, serializer):
        ecole = serializer.validated_data.get("ecole", serializer.instance.ecole)
        self._verifier_ecole_dans_perimetre(ecole)
        serializer.save()


class FiliationViewSet(viewsets.ModelViewSet):
    """Écriture ouverte au Directeur d'École, borné à sa propre école via
    l'élève rattaché (un élève est toujours dans le périmètre visible du
    Directeur au moment où on lui associe une filiation)."""

    serializer_class = FiliationSerializer
    permission_classes = [LectureAuthentifieEcritureSuperAdminOuDirecteurEcole]
    filterset_fields = ["eleve", "lien"]

    def get_queryset(self):
        return Filiation.objects.select_related("eleve").filter(
            eleve__ecole__in=ecoles_visibles(self.request.user)
        )

    def _verifier_eleve_dans_perimetre(self, eleve):
        user = self.request.user
        if user.profil in PROFILS_VUE_NATIONALE:
            return
        if not eleve or eleve.ecole not in ecoles_visibles(user):
            raise PermissionDenied("Cet élève n'est pas dans votre périmètre.")

    def perform_create(self, serializer):
        self._verifier_eleve_dans_perimetre(serializer.validated_data.get("eleve"))
        serializer.save()

    def perform_update(self, serializer):
        eleve = serializer.validated_data.get("eleve", serializer.instance.eleve)
        self._verifier_eleve_dans_perimetre(eleve)
        serializer.save()
