"""
Domaine Référentiel territorial — schéma PostgreSQL "ref".

Implémente EPIC 1 du backlog (US-1.1 à US-1.7) : régions, préfectures,
sous-préfectures (schéma A), communes et quartiers (schéma B), avec la
règle de cohérence "une école ne peut être rattachée qu'à un seul schéma à
la fois" (US-1.6) appliquée au niveau du modèle org.Ecole (Sprint 3) — les
FK exclusives sous_prefecture_id/quartier_id y porteront la contrainte
CHECK correspondante.
"""
import uuid

from django.contrib.postgres.indexes import GinIndex
from django.core.validators import RegexValidator
from django.db import models

from .utils import code_region_depuis, generer_code_unique, generer_suffixe_code


class StatutUniteTerritoriale(models.TextChoices):
    ACTIVE = "active", "Active"
    EN_ATTENTE = "en_attente", "En attente de DSE"
    SUSPENDUE = "suspendue", "Suspendue"


class TimestampedModel(models.Model):
    cree_le = models.DateTimeField(auto_now_add=True)
    modifie_le = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class Region(TimestampedModel):
    """Les 10 régions administratives (Conakry en zone spéciale) — §2.2."""

    CODE_REGEX = RegexValidator(r"^GN-[A-Z]{3}$", "Code région invalide (format attendu : GN-XXX)")

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=10, unique=True, validators=[CODE_REGEX])
    nom = models.CharField(max_length=120, unique=True)
    type_zone = models.CharField(max_length=30, default="region")  # region | zone_speciale
    chef_lieu = models.CharField(max_length=120, blank=True, null=True)
    nombre_prefectures = models.IntegerField(default=0)
    nombre_communes = models.IntegerField(default=0)
    actif = models.BooleanField(default=True)

    class Meta:
        db_table = '"ref"."region"'
        verbose_name = "Région"
        verbose_name_plural = "Régions"
        ordering = ["nom"]

    def __str__(self):
        return self.nom


class Prefecture(TimestampedModel):
    """Les 44 préfectures, rattachées à une région — §2.2."""

    CODE_REGEX = RegexValidator(
        r"^GN-[A-Z]{3}-P-[A-Z0-9]{2,4}$", "Code préfecture invalide (format attendu : GN-XXX-P-XXXX)"
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    region = models.ForeignKey(Region, on_delete=models.PROTECT, related_name="prefectures")
    code = models.CharField(max_length=15, unique=True, validators=[CODE_REGEX])
    nom = models.CharField(max_length=120)
    chef_lieu = models.CharField(max_length=120, blank=True, null=True)
    actif = models.BooleanField(default=True)

    class Meta:
        db_table = '"ref"."prefecture"'
        verbose_name = "Préfecture"
        verbose_name_plural = "Préfectures"
        ordering = ["nom"]
        constraints = [
            models.UniqueConstraint(fields=["region", "nom"], name="uq_prefecture_region_nom"),
        ]
        indexes = [
            GinIndex(fields=["nom"], name="idx_prefecture_nom_trgm", opclasses=["gin_trgm_ops"]),
        ]

    def __str__(self):
        return self.nom


class SousPrefecture(TimestampedModel):
    """Sous-préfectures (schéma A) — créées et affectées par le Super Admin (US-1.3, US-1.7)."""

    CODE_REGEX = RegexValidator(
        r"^GN-[A-Z]{3}-SP-[A-Z0-9]{2,5}$", "Code sous-préfecture invalide (format attendu : GN-XXX-SP-XXXXX)"
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    prefecture = models.ForeignKey(Prefecture, on_delete=models.PROTECT, related_name="sous_prefectures")
    code = models.CharField(max_length=25, unique=True, blank=True, validators=[CODE_REGEX])
    nom = models.CharField(max_length=120)
    statut = models.CharField(
        max_length=20, choices=StatutUniteTerritoriale.choices, default=StatutUniteTerritoriale.EN_ATTENTE
    )
    creee_par = models.ForeignKey(
        "usr.Utilisateur",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="sous_prefectures_creees",
    )
    nombre_ecoles = models.IntegerField(default=0)
    observation = models.TextField(blank=True, null=True)

    class Meta:
        db_table = '"ref"."sous_prefecture"'
        verbose_name = "Sous-préfecture"
        verbose_name_plural = "Sous-préfectures"
        ordering = ["nom"]
        constraints = [
            models.UniqueConstraint(fields=["prefecture", "nom"], name="uq_sous_prefecture_prefecture_nom"),
        ]
        indexes = [
            models.Index(fields=["statut"], name="idx_sous_prefecture_statut"),
            GinIndex(fields=["nom"], name="idx_sous_prefecture_nom_trgm", opclasses=["gin_trgm_ops"]),
        ]

    def __str__(self):
        return f"{self.nom} ({self.prefecture.nom})"

    def _generer_code(self) -> str:
        region_code = code_region_depuis(self.prefecture.region.code)
        suffixe = generer_suffixe_code(self.nom)
        base_code = f"GN-{region_code}-SP-{suffixe}"
        return generer_code_unique(SousPrefecture, base_code, exclude_pk=self.pk)

    def save(self, *args, **kwargs):
        if not self.code:
            self.code = self._generer_code()
        super().save(*args, **kwargs)


class Commune(TimestampedModel):
    """Communes — les 13 communes de Conakry (schéma B) + communes rurales éventuelles — §2.2."""

    CODE_REGEX = RegexValidator(
        r"^GN-[A-Z]{3}-C-[A-Z0-9]{2,4}$", "Code commune invalide (format attendu : GN-XXX-C-XXXX)"
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    region = models.ForeignKey(Region, on_delete=models.PROTECT, related_name="communes")
    prefecture = models.ForeignKey(
        Prefecture, on_delete=models.PROTECT, related_name="communes", null=True, blank=True
    )  # NULL pour les communes de Conakry (zone spéciale, hors schéma A)
    code = models.CharField(max_length=20, unique=True, validators=[CODE_REGEX])
    nom = models.CharField(max_length=120)
    type_commune = models.CharField(max_length=20, default="urbaine")  # urbaine | rurale
    actif = models.BooleanField(default=True)

    class Meta:
        db_table = '"ref"."commune"'
        verbose_name = "Commune"
        verbose_name_plural = "Communes"
        ordering = ["nom"]
        constraints = [
            models.UniqueConstraint(fields=["region", "nom"], name="uq_commune_region_nom"),
        ]

    def __str__(self):
        return self.nom


class Quartier(TimestampedModel):
    """Quartiers (schéma B) — créés et affectés par le Super Admin (US-1.5, US-1.7)."""

    CODE_REGEX = RegexValidator(
        r"^GN-[A-Z]{3}-Q-[A-Z0-9]{2,5}$", "Code quartier invalide (format attendu : GN-XXX-Q-XXXXX)"
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    commune = models.ForeignKey(Commune, on_delete=models.PROTECT, related_name="quartiers")
    code = models.CharField(max_length=25, unique=True, blank=True, validators=[CODE_REGEX])
    nom = models.CharField(max_length=120)
    statut = models.CharField(
        max_length=20, choices=StatutUniteTerritoriale.choices, default=StatutUniteTerritoriale.ACTIVE
    )
    cree_par = models.ForeignKey(
        "usr.Utilisateur", on_delete=models.SET_NULL, null=True, blank=True, related_name="quartiers_crees"
    )
    nombre_ecoles = models.IntegerField(default=0)
    observation = models.TextField(blank=True, null=True)

    class Meta:
        db_table = '"ref"."quartier"'
        verbose_name = "Quartier"
        verbose_name_plural = "Quartiers"
        ordering = ["nom"]
        constraints = [
            models.UniqueConstraint(fields=["commune", "nom"], name="uq_quartier_commune_nom"),
        ]
        indexes = [
            models.Index(fields=["statut"], name="idx_quartier_statut"),
            GinIndex(fields=["nom"], name="idx_quartier_nom_trgm", opclasses=["gin_trgm_ops"]),
        ]

    def __str__(self):
        return f"{self.nom} ({self.commune.nom})"

    def _generer_code(self) -> str:
        region_code = code_region_depuis(self.commune.region.code)
        suffixe = generer_suffixe_code(self.nom)
        base_code = f"GN-{region_code}-Q-{suffixe}"
        return generer_code_unique(Quartier, base_code, exclude_pk=self.pk)

    def save(self, *args, **kwargs):
        if not self.code:
            self.code = self._generer_code()
        super().save(*args, **kwargs)


class CycleCode(models.TextChoices):
    PRIMAIRE = "primaire", "Primaire"
    COLLEGE = "college", "Collège"
    LYCEE = "lycee", "Lycée"


class TypeExamen(models.TextChoices):
    CEP = "CEP", "Certificat d'Études Primaires"
    BEPC = "BEPC", "Brevet d'Études du Premier Cycle"
    BAC = "BAC", "Baccalauréat"


class Cycle(models.Model):
    """§14.1 : Primaire (6 ans, CEP), Collège (4 ans, BEPC), Lycée (3 ans, BAC) — données fixes, seedées."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=20, choices=CycleCode.choices, unique=True)
    libelle = models.CharField(max_length=60)
    duree_annees = models.SmallIntegerField()
    ordre = models.SmallIntegerField()
    examen_fin = models.CharField(max_length=10, choices=TypeExamen.choices, null=True, blank=True)

    class Meta:
        db_table = '"ref"."cycle"'
        verbose_name = "Cycle"
        verbose_name_plural = "Cycles"
        ordering = ["ordre"]

    def __str__(self):
        return self.libelle


class Classe(models.Model):
    """§14.1 : CP1..CM2, 7e..10e, 11e..Terminale — données fixes, seedées."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    cycle = models.ForeignKey(Cycle, on_delete=models.PROTECT, related_name="classes")
    code = models.CharField(max_length=10, unique=True)
    libelle = models.CharField(max_length=60)
    niveau = models.SmallIntegerField()
    est_classe_fin = models.BooleanField(default=False)  # CM2, 10e, Terminale
    ordre = models.SmallIntegerField()

    class Meta:
        db_table = '"ref"."classe"'
        verbose_name = "Classe"
        verbose_name_plural = "Classes"
        ordering = ["ordre"]

    def __str__(self):
        return self.libelle
