"""
Domaine Utilisateurs — schéma PostgreSQL "usr".

Sprint 1 : uniquement le modèle Utilisateur, posé maintenant comme
AUTH_USER_MODEL pour éviter la dette technique classique d'un projet Django
qui démarre sur le modèle par défaut (le changer après coup impose de
refaire toutes les migrations). Les vues d'authentification, l'OTP, la
réinitialisation de mot de passe et l'affectation aux périmètres
territoriaux (org.AffectationResponsable) sont développées au Sprint 2
(EPIC 2 — voir SIGEP_Backlog_Sprints.pdf).
"""
import uuid

from django.contrib.auth.base_user import AbstractBaseUser, BaseUserManager
from django.contrib.auth.models import PermissionsMixin
from django.db import models


class Profil(models.TextChoices):
    CITOYEN = "citoyen", "Citoyen"
    ENSEIGNANT = "enseignant", "Enseignant"
    DIRECTEUR_ECOLE = "directeur_ecole", "Directeur d'école"
    DSE = "dse", "Directeur Sous-Préfectoral"
    DCE = "dce", "Directeur Communal"
    DPE = "dpe", "Directeur Préfectoral"
    IR = "ir", "Inspecteur Régional"
    DGE = "dge", "Directeur Général de l'Éducation"
    SUPER_ADMIN = "super_admin", "Super Admin"
    MINISTRE = "ministre", "Ministre"
    CABINET = "cabinet", "Cabinet"


class StatutCompte(models.TextChoices):
    ACTIF = "actif", "Actif"
    EN_ATTENTE_ACTIVATION = "en_attente_activation", "En attente d'activation"
    SUSPENDU = "suspendu", "Suspendu"
    REVOQUE = "revoque", "Révoqué"


class Sexe(models.TextChoices):
    M = "M", "Masculin"
    F = "F", "Féminin"


class UtilisateurManager(BaseUserManager):
    def create_user(self, identifiant, telephone, profil, password=None, **extra_fields):
        if not identifiant:
            raise ValueError("L'identifiant est obligatoire")
        if not telephone:
            raise ValueError("Le téléphone est obligatoire")
        utilisateur = self.model(identifiant=identifiant, telephone=telephone, profil=profil, **extra_fields)
        utilisateur.set_password(password)
        utilisateur.save(using=self._db)
        return utilisateur

    def create_superuser(self, identifiant, telephone, password=None, **extra_fields):
        extra_fields.pop("profil", None)  # toujours forcé à SUPER_ADMIN ci-dessous
        extra_fields.setdefault("statut", StatutCompte.ACTIF)
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("mot_de_passe_provisoire", False)
        extra_fields.setdefault("nom", "Super")
        extra_fields.setdefault("prenoms", "Admin")
        if extra_fields.get("is_staff") is not True:
            raise ValueError("Le superutilisateur doit avoir is_staff=True")
        if extra_fields.get("is_superuser") is not True:
            raise ValueError("Le superutilisateur doit avoir is_superuser=True")
        return self.create_user(identifiant, telephone, Profil.SUPER_ADMIN, password, **extra_fields)


class Utilisateur(AbstractBaseUser, PermissionsMixin):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    identifiant = models.CharField(max_length=150, unique=True)
    email = models.EmailField(unique=True, null=True, blank=True)
    telephone = models.CharField(max_length=30)
    mot_de_passe_provisoire = models.BooleanField(default=True)
    profil = models.CharField(max_length=20, choices=Profil.choices)
    statut = models.CharField(
        max_length=25, choices=StatutCompte.choices, default=StatutCompte.EN_ATTENTE_ACTIVATION
    )

    nom = models.CharField(max_length=120)
    prenoms = models.CharField(max_length=180)
    date_naissance = models.DateField(null=True, blank=True)
    sexe = models.CharField(max_length=1, choices=Sexe.choices, null=True, blank=True)
    photo_url = models.TextField(null=True, blank=True)

    otp_secret = models.CharField(max_length=64, null=True, blank=True)
    otp_actif = models.BooleanField(default=False)
    tentatives_echec = models.SmallIntegerField(default=0)

    cree_par = models.ForeignKey(
        "self", on_delete=models.SET_NULL, null=True, blank=True, related_name="comptes_crees"
    )
    cree_le = models.DateTimeField(auto_now_add=True)
    modifie_le = models.DateTimeField(auto_now=True)

    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)

    objects = UtilisateurManager()

    USERNAME_FIELD = "identifiant"
    REQUIRED_FIELDS = ["telephone"]  # "profil" est forcé à SUPER_ADMIN pour createsuperuser

    class Meta:
        db_table = '"usr"."utilisateur"'
        verbose_name = "Utilisateur"
        verbose_name_plural = "Utilisateurs"
        ordering = ["nom", "prenoms"]

    def __str__(self):
        return f"{self.nom} {self.prenoms} ({self.get_profil_display()})"

    @property
    def nom_complet(self):
        return f"{self.prenoms} {self.nom}"


class StatutEnseignant(models.TextChoices):
    TITULAIRE = "titulaire", "Titulaire"
    CONTRACTUEL = "contractuel", "Contractuel"
    STAGIAIRE = "stagiaire", "Stagiaire"
    VACATAIRE = "vacataire", "Vacataire"
    RETRAITE = "retraite", "Retraité"


class Enseignant(models.Model):
    """US-4.1 : fiche enseignant, extension de Utilisateur (profil=enseignant)
    avec les champs propres au métier (§6.3, §7.1 du dossier fonctionnel)."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    utilisateur = models.OneToOneField(Utilisateur, on_delete=models.CASCADE, related_name="fiche_enseignant")
    matricule = models.CharField(max_length=20, unique=True, blank=True)
    matiere_principale = models.CharField(max_length=100, blank=True)
    statut_enseignant = models.CharField(
        max_length=20, choices=StatutEnseignant.choices, default=StatutEnseignant.TITULAIRE
    )
    cree_le = models.DateTimeField(auto_now_add=True)
    modifie_le = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = '"usr"."enseignant"'
        verbose_name = "Enseignant"
        verbose_name_plural = "Enseignants"
        ordering = ["utilisateur__nom"]

    def __str__(self):
        return f"{self.matricule} — {self.utilisateur.nom_complet}"

    def save(self, *args, **kwargs):
        if not self.matricule:
            n = Enseignant.objects.count() + 1
            self.matricule = f"ENS-{n:03d}"
        super().save(*args, **kwargs)


class InterventionEnseignant(models.Model):
    """US-4.1/US-4.2/US-4.6 : rattachement direct d'un enseignant à une école et
    une classe, avec matière et volume horaire (§7.1, §11.4). Version simple,
    hors circuit de validation à 4 niveaux (celui-ci concerne les MUTATIONS
    formelles entre écoles — EPIC 10, Sprint 7-8)."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    enseignant = models.ForeignKey(Enseignant, on_delete=models.CASCADE, related_name="interventions")
    ecole = models.ForeignKey("org.Ecole", on_delete=models.PROTECT, related_name="interventions_enseignants")
    classe = models.ForeignKey("ref.Classe", on_delete=models.PROTECT, related_name="interventions_enseignants")
    matiere = models.CharField(max_length=100)
    volume_horaire_hebdo = models.DecimalField(max_digits=4, decimal_places=1, default=0)
    annee_academique = models.CharField(max_length=9, default="2026-2027")
    actif = models.BooleanField(default=True)
    cree_le = models.DateTimeField(auto_now_add=True)
    modifie_le = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = '"usr"."intervention_enseignant"'
        verbose_name = "Intervention d'un enseignant"
        verbose_name_plural = "Interventions des enseignants"
        ordering = ["-cree_le"]
        constraints = [
            models.UniqueConstraint(
                fields=["enseignant", "ecole", "classe", "matiere", "annee_academique"],
                name="uq_intervention_enseignant",
            ),
        ]

    def __str__(self):
        return f"{self.enseignant} — {self.ecole} — {self.classe}"
