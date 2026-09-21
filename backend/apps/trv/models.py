"""
Domaine Transversal — schéma PostgreSQL "trv".

Sprint 3 (EPIC 4, US-4.4) : trv.Equipement — inventaire d'une école (§6.5).
Sprint 4 (EPIC 5 — portail citoyen, EPIC 6 — signalements & inspections) :
trv.Signalement, trv.Inspection, trv.MessageContact. Messagerie et
notifications restent prévues au Sprint 9. Voir SIGEP_Backlog_Sprints.pdf.
"""
import uuid

from django.db import models


class Equipement(models.Model):
    """US-4.4 : inventaire d'équipements d'une école (§6.5 — Tables-bancs,
    Tableaux noirs, Ordinateurs, Manuels scolaires, etc.)."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    ecole = models.ForeignKey("org.Ecole", on_delete=models.CASCADE, related_name="equipements")
    type_equipement = models.CharField(max_length=100)
    total = models.IntegerField(default=0)
    fonctionnel = models.IntegerField(default=0)
    a_reparer = models.IntegerField(default=0)

    cree_le = models.DateTimeField(auto_now_add=True)
    modifie_le = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = '"trv"."equipement"'
        verbose_name = "Équipement"
        verbose_name_plural = "Équipements"
        ordering = ["ecole", "type_equipement"]
        constraints = [
            models.UniqueConstraint(fields=["ecole", "type_equipement"], name="uq_equipement_ecole_type"),
            models.CheckConstraint(
                name="chk_equipement_total_coherent",
                check=models.Q(fonctionnel__lte=models.F("total")),
            ),
        ]

    def __str__(self):
        return f"{self.type_equipement} — {self.ecole.nom}"


class CategorieSignalement(models.TextChoices):
    INFRASTRUCTURE = "infrastructure", "Infrastructure"
    PEDAGOGIQUE = "pedagogique", "Pédagogique"
    SECURITE = "securite", "Sécurité"
    ADMINISTRATIF = "administratif", "Administratif"
    AUTRE = "autre", "Autre"


class OrigineSignalement(models.TextChoices):
    CITOYEN = "citoyen", "Citoyen"
    INTERNE = "interne", "Interne"


class StatutSignalement(models.TextChoices):
    NOUVEAU = "nouveau", "Nouveau"
    EN_COURS = "en_cours", "En cours"
    TRAITE = "traite", "Traité"
    REJETE = "rejete", "Rejeté"


class Signalement(models.Model):
    """US-5.3 (créé par un citoyen, sans compte, via le portail public) et
    US-6.1 (créé en interne par un agent) — même table, distinguée par
    `origine` ; US-6.2 fait évoluer `statut` (nouveau -> en_cours -> traité/rejeté)."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    ecole = models.ForeignKey("org.Ecole", on_delete=models.CASCADE, related_name="signalements")
    categorie = models.CharField(
        max_length=20, choices=CategorieSignalement.choices, default=CategorieSignalement.AUTRE
    )
    description = models.TextField()

    origine = models.CharField(max_length=10, choices=OrigineSignalement.choices, default=OrigineSignalement.INTERNE)
    auteur = models.ForeignKey(
        "usr.Utilisateur", on_delete=models.SET_NULL, null=True, blank=True, related_name="signalements_effectues"
    )
    # Renseignés uniquement pour un signalement citoyen (pas de compte, donc
    # pas d'auteur) — permettent de le recontacter si besoin.
    nom_declarant = models.CharField(max_length=150, blank=True)
    telephone_declarant = models.CharField(max_length=20, blank=True)

    statut = models.CharField(max_length=15, choices=StatutSignalement.choices, default=StatutSignalement.NOUVEAU)
    traite_par = models.ForeignKey(
        "usr.Utilisateur", on_delete=models.SET_NULL, null=True, blank=True, related_name="signalements_traites"
    )
    commentaire_traitement = models.TextField(blank=True)
    date_traitement = models.DateTimeField(null=True, blank=True)

    cree_le = models.DateTimeField(auto_now_add=True)
    modifie_le = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = '"trv"."signalement"'
        verbose_name = "Signalement"
        verbose_name_plural = "Signalements"
        ordering = ["-cree_le"]

    def __str__(self):
        return f"{self.get_categorie_display()} — {self.ecole.nom}"


class StatutInspection(models.TextChoices):
    PLANIFIEE = "planifiee", "Planifiée"
    REALISEE = "realisee", "Réalisée"
    ANNULEE = "annulee", "Annulée"


class Inspection(models.Model):
    """US-6.3 (planification) et US-6.4 (rapport, visible par les niveaux
    hiérarchiques concernés — bornée via ecoles_visibles comme le reste)."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    ecole = models.ForeignKey("org.Ecole", on_delete=models.CASCADE, related_name="inspections")
    signalement = models.ForeignKey(
        Signalement, on_delete=models.SET_NULL, null=True, blank=True, related_name="inspections"
    )
    inspecteur = models.ForeignKey(
        "usr.Utilisateur", on_delete=models.PROTECT, related_name="inspections_assignees"
    )
    planifie_par = models.ForeignKey(
        "usr.Utilisateur", on_delete=models.SET_NULL, null=True, blank=True, related_name="inspections_planifiees"
    )

    date_prevue = models.DateField()
    statut = models.CharField(max_length=15, choices=StatutInspection.choices, default=StatutInspection.PLANIFIEE)

    date_realisation = models.DateField(null=True, blank=True)
    rapport = models.TextField(blank=True)

    cree_le = models.DateTimeField(auto_now_add=True)
    modifie_le = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = '"trv"."inspection"'
        verbose_name = "Inspection"
        verbose_name_plural = "Inspections"
        ordering = ["-date_prevue"]

    def __str__(self):
        return f"Inspection {self.ecole.nom} — {self.date_prevue}"


class MessageContact(models.Model):
    """US-5.4 : formulaire de contact public (école ou administration).
    L'accusé de réception est l'identifiant renvoyé au citoyen à la création —
    pas de boîte de messagerie interne pour l'instant (prévue Sprint 9)."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    ecole = models.ForeignKey(
        "org.Ecole", on_delete=models.SET_NULL, null=True, blank=True, related_name="messages_contact"
    )
    nom = models.CharField(max_length=150)
    email = models.EmailField(blank=True)
    telephone = models.CharField(max_length=20, blank=True)
    sujet = models.CharField(max_length=200)
    message = models.TextField()
    cree_le = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = '"trv"."message_contact"'
        verbose_name = "Message de contact"
        verbose_name_plural = "Messages de contact"
        ordering = ["-cree_le"]

    def __str__(self):
        return f"{self.sujet} — {self.nom}"
