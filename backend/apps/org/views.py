from django.db import IntegrityError, transaction
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from apps.aud.services import consigner
from apps.core.permissions import EstSuperAdmin

from .models import AffectationResponsable, StatutAffectation
from .serializers import AffectationResponsableSerializer, ReaffectationSerializer


class AffectationResponsableViewSet(viewsets.ModelViewSet):
    """US-2.3 (affectation) et US-2.4 (réaffectation) — réservé au Super Admin."""

    queryset = AffectationResponsable.objects.select_related(
        "utilisateur", "sous_prefecture", "commune", "prefecture", "region"
    ).all()
    serializer_class = AffectationResponsableSerializer
    permission_classes = [EstSuperAdmin]
    filterset_fields = ["profil", "statut", "utilisateur"]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            with transaction.atomic():
                affectation = serializer.save(affecte_par=request.user)
        except IntegrityError as exc:
            raise ValidationError(
                "Périmètre invalide pour ce profil, ou cet utilisateur a déjà une affectation active "
                "(utilisez /reaffecter/ pour la remplacer)."
            ) from exc
        consigner(
            acteur=request.user,
            action="affectation_responsable",
            cible_type="org.AffectationResponsable",
            cible_id=affectation.id,
            detail=f"{affectation.utilisateur.identifiant} affecté ({affectation.profil})",
        )
        return Response(self.get_serializer(affectation).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"])
    def reaffecter(self, request, pk=None):
        """US-2.4 : clôture l'affectation courante et en ouvre une nouvelle,
        tracée dans le journal d'activité."""
        ancienne = self.get_object()
        entree = ReaffectationSerializer(data=request.data)
        entree.is_valid(raise_exception=True)

        try:
            with transaction.atomic():
                ancienne.statut = StatutAffectation.INACTIF
                ancienne.date_fin = timezone.localdate()
                ancienne.save(update_fields=["statut", "date_fin"])
                nouvelle = AffectationResponsable.objects.create(
                    utilisateur=ancienne.utilisateur,
                    profil=ancienne.profil,
                    affecte_par=request.user,
                    **entree.validated_data,
                )
        except IntegrityError as exc:
            raise ValidationError("Nouveau périmètre invalide pour ce profil.") from exc

        consigner(
            acteur=request.user,
            action="reaffectation_responsable",
            cible_type="org.AffectationResponsable",
            cible_id=nouvelle.id,
            detail=f"{ancienne.utilisateur.identifiant} réaffecté (depuis affectation {ancienne.id})",
        )
        return Response(AffectationResponsableSerializer(nouvelle).data, status=status.HTTP_201_CREATED)
