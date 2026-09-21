from django.utils import timezone
from rest_framework import generics, permissions, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.aud.services import consigner
from apps.core.permissions import LectureAuthentifieEcritureSuperAdmin
from apps.org.services import ecoles_visibles

from .models import Equipement, Inspection, MessageContact, Signalement, StatutInspection
from .serializers import (
    EquipementSerializer,
    InspectionSerializer,
    MessageContactSerializer,
    RapportInspectionSerializer,
    SignalementPublicSerializer,
    SignalementSerializer,
    TraiterSignalementSerializer,
)


class EquipementViewSet(viewsets.ModelViewSet):
    """US-4.4 : inventaire d'équipements, borné au périmètre du profil connecté."""

    serializer_class = EquipementSerializer
    permission_classes = [LectureAuthentifieEcritureSuperAdmin]
    filterset_fields = ["ecole"]

    def get_queryset(self):
        return Equipement.objects.select_related("ecole").filter(ecole__in=ecoles_visibles(self.request.user))


class SignalementViewSet(viewsets.ModelViewSet):
    """US-6.1 (création interne) et US-6.2 (traitement) — lecture/écriture
    bornées au périmètre du profil connecté, comme Équipement/Élève."""

    serializer_class = SignalementSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["ecole", "statut", "categorie", "origine"]
    search_fields = ["description", "nom_declarant"]

    def get_queryset(self):
        return Signalement.objects.select_related("ecole", "auteur", "traite_par").filter(
            ecole__in=ecoles_visibles(self.request.user)
        )

    def perform_create(self, serializer):
        signalement = serializer.save(origine="interne", auteur=self.request.user)
        consigner(
            acteur=self.request.user,
            action="creation_signalement",
            cible_type="trv.Signalement",
            cible_id=signalement.id,
            detail=f"Signalement {signalement.categorie} — {signalement.ecole.nom}",
        )

    @action(detail=True, methods=["post"])
    def traiter(self, request, pk=None):
        """US-6.2 : fait passer le statut à en_cours/traité/rejeté."""
        signalement = self.get_object()
        entree = TraiterSignalementSerializer(data=request.data)
        entree.is_valid(raise_exception=True)
        signalement.statut = entree.validated_data["statut"]
        signalement.commentaire_traitement = entree.validated_data["commentaire_traitement"]
        signalement.traite_par = request.user
        signalement.date_traitement = timezone.now()
        signalement.save(
            update_fields=["statut", "commentaire_traitement", "traite_par", "date_traitement", "modifie_le"]
        )
        consigner(
            acteur=request.user,
            action="traitement_signalement",
            cible_type="trv.Signalement",
            cible_id=signalement.id,
            detail=f"Signalement {signalement.id} -> {signalement.statut}",
        )
        return Response(SignalementSerializer(signalement).data)


class SignalementPublicView(generics.CreateAPIView):
    """US-5.3 : un citoyen, sans compte, signale un problème lié à une école."""

    queryset = Signalement.objects.all()
    serializer_class = SignalementPublicSerializer
    permission_classes = [permissions.AllowAny]


class InspectionViewSet(viewsets.ModelViewSet):
    """US-6.3 (planification) et US-6.4 (rapport) — bornées au périmètre."""

    serializer_class = InspectionSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["ecole", "statut", "inspecteur"]

    def get_queryset(self):
        return Inspection.objects.select_related("ecole", "inspecteur", "planifie_par", "signalement").filter(
            ecole__in=ecoles_visibles(self.request.user)
        )

    def perform_create(self, serializer):
        inspection = serializer.save(planifie_par=self.request.user)
        consigner(
            acteur=self.request.user,
            action="planification_inspection",
            cible_type="trv.Inspection",
            cible_id=inspection.id,
            detail=f"Inspection planifiée — {inspection.ecole.nom} le {inspection.date_prevue}",
        )

    @action(detail=True, methods=["post"], url_path="consigner-rapport")
    def consigner_rapport(self, request, pk=None):
        """US-6.4 : compte-rendu d'une inspection réalisée."""
        inspection = self.get_object()
        entree = RapportInspectionSerializer(data=request.data)
        entree.is_valid(raise_exception=True)
        inspection.date_realisation = entree.validated_data["date_realisation"]
        inspection.rapport = entree.validated_data["rapport"]
        inspection.statut = StatutInspection.REALISEE
        inspection.save(update_fields=["date_realisation", "rapport", "statut", "modifie_le"])
        consigner(
            acteur=request.user,
            action="rapport_inspection",
            cible_type="trv.Inspection",
            cible_id=inspection.id,
            detail=f"Rapport consigné — {inspection.ecole.nom}",
        )
        return Response(InspectionSerializer(inspection).data)


class MessageContactPublicView(generics.CreateAPIView):
    """US-5.4 : formulaire de contact public (école ou administration)."""

    queryset = MessageContact.objects.all()
    serializer_class = MessageContactSerializer
    permission_classes = [permissions.AllowAny]
