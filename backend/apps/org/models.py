"""
Domaine Organisation — schéma PostgreSQL "org".

Sprint 2 : org.AffectationResponsable (US-2.3, US-2.4).
Sprint 3 : org.Ecole (EPIC 3, US-3.1 à US-3.5) — DDL reprise telle que fournie
initialement (org.ecole, §5 du dossier SQL source).

Les directions territoriales (DirectionPréfectorale/Régionale/Communale/
Générale) ne sont pas requises par les critères d'acceptation d'EPIC 3/4 et
restent hors scope pour l'instant.
"""
import uuid

from django.contrib.gis.db.models import PointField
from django.db import models
from django.utils import timezone

from apps.ref.models import Commune, Prefecture, Quartier, Region, SousPrefecture
from apps.ref.utils import code_region_depuis, generer_suffixe_code
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
    ecole = models.ForeignKey(
        "Ecole", on_delete=models.PROTECT, null=True, blank=True, related_name="affectations"
    )

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


class SchemaIdentification(models.TextChoices):
    A = "A", "Sous-préfecture"
    B = "B", "Quartier"


class TypeEcole(models.TextChoices):
    """Statut de l'école — §2.1 du dossier fonctionnel : uniquement public ou
    privé, aucune sous-catégorie supplémentaire."""

    PUBLIQUE = "publique", "Publique"
    PRIVEE = "privee", "Privée"


class LangueEnseignement(models.TextChoices):
    FRANCAIS = "francais", "Français"
    ARABE = "arabe", "Arabe"
    FRANCAIS_ARABE = "francais_arabe", "Français-Arabe"
    BILINGUE = "bilingue", "Bilingue"
    ANGLAIS = "anglais", "Anglais"


class EtatInfrastructure(models.TextChoices):
    # Légende officielle §3 du dossier fonctionnel.
    CONFORME = "conforme", "Conforme"
    A_RENOVER = "a_renover", "À rénover"
    CRITIQUE = "critique", "Critique"


class StatutOuverture(models.TextChoices):
    OUVERTE = "ouverte", "Ouverte"
    FERMEE = "fermee", "Fermée"
    SUSPENDUE = "suspendue", "Suspendue"


class Ecole(models.Model):
    """US-3.1 à US-3.5 : fiche école, schéma A (sous-préfecture) ou B (quartier)
    exclusif — §2.1/§15 du dossier fonctionnel, chk_ecole_schema_a/b du DDL fourni."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code_ecole = models.CharField(max_length=30, unique=True, blank=True)  # auto-généré
    nom = models.CharField(max_length=200)
    schema_identification = models.CharField(max_length=1, choices=SchemaIdentification.choices)

    # Rattachement territorial (exclusif selon le schéma ; prefecture/commune/region
    # sont dérivés automatiquement à l'enregistrement, jamais saisis directement).
    sous_prefecture = models.ForeignKey(
        SousPrefecture, on_delete=models.PROTECT, null=True, blank=True, related_name="ecoles"
    )
    prefecture = models.ForeignKey(
        Prefecture, on_delete=models.PROTECT, null=True, blank=True, related_name="ecoles"
    )
    commune = models.ForeignKey(Commune, on_delete=models.PROTECT, null=True, blank=True, related_name="ecoles")
    quartier = models.ForeignKey(Quartier, on_delete=models.PROTECT, null=True, blank=True, related_name="ecoles")
    region = models.ForeignKey(Region, on_delete=models.PROTECT, related_name="ecoles")

    type_ecole = models.CharField(max_length=20, choices=TypeEcole.choices)
    langue_enseignement = models.CharField(max_length=20, choices=LangueEnseignement.choices)
    annee_creation = models.SmallIntegerField(null=True, blank=True)
    coordonnees_gps = PointField(geography=True, srid=4326, null=True, blank=True)
    adresse = models.TextField(blank=True)

    # Capacité et effectifs — dénormalisés pour la performance des tableaux de
    # bord (US-5.x, US-12.x), recalculés au fil des sprints suivants (élèves,
    # enseignants) plutôt que saisis manuellement une fois ces modules prêts.
    capacite_eleves = models.IntegerField(default=0)
    nombre_salles = models.IntegerField(default=0)
    nombre_salles_fonctionnelles = models.IntegerField(default=0)
    nombre_enseignants = models.IntegerField(default=0)
    nombre_eleves = models.IntegerField(default=0)
    nombre_eleves_filles = models.IntegerField(default=0)
    nombre_eleves_garcons = models.IntegerField(default=0)

    etat_general = models.CharField(
        max_length=20, choices=EtatInfrastructure.choices, default=EtatInfrastructure.CONFORME
    )
    score = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    statut_ouverture = models.CharField(
        max_length=20, choices=StatutOuverture.choices, default=StatutOuverture.OUVERTE
    )

    directeur = models.ForeignKey(
        "usr.Utilisateur", on_delete=models.SET_NULL, null=True, blank=True, related_name="ecoles_dirigees"
    )

    actif = models.BooleanField(default=True)
    cree_le = models.DateTimeField(auto_now_add=True)
    modifie_le = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = '"org"."ecole"'
        verbose_name = "École"
        verbose_name_plural = "Écoles"
        ordering = ["nom"]
        constraints = [
            models.CheckConstraint(
                name="chk_ecole_schema",
                check=(
                    models.Q(
                        schema_identification=SchemaIdentification.A,
                        sous_prefecture_id__isnull=False,
                        quartier_id__isnull=True,
                    )
                    | models.Q(
                        schema_identification=SchemaIdentification.B,
                        quartier_id__isnull=False,
                        sous_prefecture_id__isnull=True,
                    )
                ),
            ),
        ]

    def __str__(self):
        return self.nom

    def _deriver_rattachement(self):
        """Schéma A ou B exclusif : prefecture/commune/region toujours dérivés,
        jamais saisis (US-1.6 appliquée ici, au niveau du seul modèle qui en a besoin)."""
        if self.schema_identification == SchemaIdentification.A and self.sous_prefecture:
            self.prefecture = self.sous_prefecture.prefecture
            self.region = self.sous_prefecture.prefecture.region
            self.quartier = None
            self.commune = None
        elif self.schema_identification == SchemaIdentification.B and self.quartier:
            self.commune = self.quartier.commune
            self.region = self.quartier.commune.region
            self.sous_prefecture = None
            self.prefecture = None

    def _generer_code(self) -> str:
        region_code = code_region_depuis(self.region.code)
        unite = self.sous_prefecture if self.schema_identification == SchemaIdentification.A else self.quartier
        suffixe = generer_suffixe_code(unite.nom)
        base = f"GN-{region_code}-{suffixe}"
        n = Ecole.objects.filter(code_ecole__startswith=f"{base}-").count() + 1
        return f"{base}-{n:03d}"

    def save(self, *args, **kwargs):
        self._deriver_rattachement()
        if not self.code_ecole:
            self.code_ecole = self._generer_code()
        super().save(*args, **kwargs)
