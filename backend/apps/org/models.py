"""
Domaine Organisation — schéma PostgreSQL "org".

Sprint 2 : org.AffectationResponsable (US-2.3, US-2.4) — un responsable
territorial (DSE/DCE/DPE/IR) n'est affecté qu'à un seul périmètre actif à la
fois (§2.3 : "un responsable, un périmètre"), avec réaffectation tracée.

org.Ecole et les directions territoriales (DirectionPréfectorale/Régionale/
Communale/Générale) restent prévues au Sprint 3 (EPIC 3/4) — `ecole_id` est
donc laissé en UUID brut (pas de ForeignKey) jusqu'à ce que org.Ecole existe,
comme le faisait déjà le DDL fourni pour ce même champ à ce stade.
"""
import uuid

from django.db import models
from django.utils import timezone

from apps.ref.models import Commune, Prefecture, Region, SousPrefecture
from apps.usr.models import Profil


class StatutAffectation(models.TextChoices):
    ACTIF = "actif", "Actif"
    INACTIF = "inactif", "Inactif"


class AffectationResponsable(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    utilisateur = models.ForeignKey("usr.Utilisateur", on_delete=models.CASCADE, related_name="affectations")
    profil = models.CharField(max_length=20, choices=Profil.choices)

    sous_prefecture = models.ForeignKey(
        SousPrefecture, on_delete=models.PROTECT, null=True, blank=True, related_name="affectations"
    )
    commune = models.ForeignKey(
        Commune, on_delete=models.PROTECT, null=True, blank=True, related_name="affectations"
    )
    prefecture = models.ForeignKey(
        Prefecture, on_delete=models.PROTECT, null=True, blank=True, related_name="affectations"
    )
    region = models.ForeignKey(
        Region, on_delete=models.PROTECT, null=True, blank=True, related_name="affectations"
    )
    ecole_id = models.UUIDField(null=True, blank=True)  # FK vers org.Ecole ajoutée au Sprint 3

    date_debut = models.DateField(default=timezone.localdate)
    date_fin = models.DateField(null=True, blank=True)
    statut = models.CharField(max_length=20, choices=StatutAffectation.choices, default=StatutAffectation.ACTIF)

    affecte_par = models.ForeignKey(
        "usr.Utilisateur", on_delete=models.SET_NULL, null=True, blank=True, related_name="affectations_realisees"
    )
    motif = models.TextField(blank=True)

    cree_le = models.DateTimeField(auto_now_add=True)
    modifie_le = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = '"org"."affectation_responsable"'
        verbose_name = "Affectation d'un responsable"
        verbose_name_plural = "Affectations des responsables"
        ordering = ["-date_debut"]
        constraints = [
            # §2.3 : "un responsable, un périmètre" — un seul enregistrement
            # actif (statut=actif, date_fin NULL) par utilisateur.
            models.UniqueConstraint(
                fields=["utilisateur"],
                condition=models.Q(statut=StatutAffectation.ACTIF, date_fin__isnull=True),
                name="uq_affectation_active_par_utilisateur",
            ),
            # Cohérence périmètre <-> profil (miroir de chk_affectation_perimetre du DDL fourni).
            models.CheckConstraint(
                name="chk_affectation_perimetre",
                check=(
                    models.Q(
                        profil=Profil.DSE, sous_prefecture_id__isnull=False,
                        commune_id__isnull=True, prefecture_id__isnull=True,
                        region_id__isnull=True, ecole_id__isnull=True,
                    )
                    | models.Q(
                        profil=Profil.DCE, commune_id__isnull=False,
                        sous_prefecture_id__isnull=True, prefecture_id__isnull=True,
                        region_id__isnull=True, ecole_id__isnull=True,
                    )
                    | models.Q(
                        profil=Profil.DPE, prefecture_id__isnull=False,
                        sous_prefecture_id__isnull=True, commune_id__isnull=True,
                        region_id__isnull=True, ecole_id__isnull=True,
                    )
                    | models.Q(
                        profil=Profil.IR, region_id__isnull=False,
                        sous_prefecture_id__isnull=True, commune_id__isnull=True,
                        prefecture_id__isnull=True, ecole_id__isnull=True,
                    )
                    | models.Q(
                        profil=Profil.DIRECTEUR_ECOLE, ecole_id__isnull=False,
                        sous_prefecture_id__isnull=True, commune_id__isnull=True,
                        prefecture_id__isnull=True, region_id__isnull=True,
                    )
                    | models.Q(
                        profil__in=[Profil.SUPER_ADMIN, Profil.MINISTRE, Profil.CABINET, Profil.DGE],
                        sous_prefecture_id__isnull=True, commune_id__isnull=True,
                        prefecture_id__isnull=True, region_id__isnull=True, ecole_id__isnull=True,
                    )
                ),
            ),
        ]

    def __str__(self):
        return f"{self.utilisateur.identifiant} — {self.get_profil_display()}"
