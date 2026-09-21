"""
Domaine Pédagogie — schéma PostgreSQL "ped".

Sprint 3 (EPIC 4, US-4.3) : ped.Eleve + ped.Filiation — §6.7 du dossier
fonctionnel (identité, filiation). Notes, bulletins, livret scolaire complet
et examens nationaux restent prévus au Sprint 5-6 (RELEASE 3).
"""
import datetime
import uuid

from django.db import models

from apps.usr.models import Sexe


class StatutEleve(models.TextChoices):
    ACTIF = "actif", "Actif"
    TRANSFERE = "transfere", "Transféré"
    DIPLOME = "diplome", "Diplômé"
    ABANDON = "abandon", "Abandon"


class LienFiliation(models.TextChoices):
    PERE = "pere", "Père"
    MERE = "mere", "Mère"
    TUTEUR = "tuteur", "Tuteur"
    FRERE_SOEUR = "frere_soeur", "Frère / Sœur"


class Eleve(models.Model):
    """US-4.3 : élève rattaché à une école et une classe (§6.7)."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    matricule = models.CharField(max_length=30, unique=True, blank=True)  # GN-SIGEP-<année>-<NNNNNN>
    nom = models.CharField(max_length=120)
    prenoms = models.CharField(max_length=180)
    sexe = models.CharField(max_length=1, choices=Sexe.choices)
    date_naissance = models.DateField(null=True, blank=True)
    lieu_naissance = models.CharField(max_length=120, blank=True)
    photo_url = models.TextField(blank=True)

    ecole = models.ForeignKey("org.Ecole", on_delete=models.PROTECT, related_name="eleves")
    classe = models.ForeignKey("ref.Classe", on_delete=models.PROTECT, related_name="eleves")
    annee_academique = models.CharField(max_length=9, default="2026-2027")
    statut = models.CharField(max_length=20, choices=StatutEleve.choices, default=StatutEleve.ACTIF)

    cree_le = models.DateTimeField(auto_now_add=True)
    modifie_le = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = '"ped"."eleve"'
        verbose_name = "Élève"
        verbose_name_plural = "Élèves"
        ordering = ["nom", "prenoms"]
        indexes = [
            models.Index(fields=["ecole", "classe"], name="idx_eleve_ecole_classe"),
        ]

    def __str__(self):
        return f"{self.matricule} — {self.nom_complet}"

    @property
    def nom_complet(self):
        return f"{self.prenoms} {self.nom}"

    def _generer_matricule(self) -> str:
        annee = datetime.date.today().year
        base = f"GN-SIGEP-{annee}-"
        n = Eleve.objects.filter(matricule__startswith=base).count() + 1
        return f"{base}{n:06d}"

    def save(self, *args, **kwargs):
        if not self.matricule:
            self.matricule = self._generer_matricule()
        super().save(*args, **kwargs)


class Filiation(models.Model):
    """§6.7 : parents/tuteurs/fratrie d'un élève."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    eleve = models.ForeignKey(Eleve, on_delete=models.CASCADE, related_name="filiations")
    lien = models.CharField(max_length=20, choices=LienFiliation.choices)
    nom_complet = models.CharField(max_length=200)
    telephone = models.CharField(max_length=30, blank=True)
    urgence = models.BooleanField(default=False)

    cree_le = models.DateTimeField(auto_now_add=True)
    modifie_le = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = '"ped"."filiation"'
        verbose_name = "Filiation"
        verbose_name_plural = "Filiations"
        ordering = ["eleve", "lien"]

    def __str__(self):
        return f"{self.get_lien_display()} de {self.eleve.nom_complet} — {self.nom_complet}"
