"""
Domaine Pédagogie — schéma PostgreSQL "ped".

Sprint 3 (EPIC 4, US-4.3) : ped.Eleve + ped.Filiation — §6.7 du dossier
fonctionnel (identité, filiation). Sprint 5-6 (EPIC 7/8) : Note, Presence,
InscriptionExamen, Deliberation. Bulletin et livret scolaire ne sont PAS des
tables — ce sont des agrégats calculés à la volée depuis Note (voir
ped/services.py), pour rester toujours cohérents avec les notes saisies.
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
    # US-9.2 : vrai fichier uploadé (pas une URL à coller) — un directeur a une
    # photo sur son téléphone/ordinateur, pas un lien déjà hébergé quelque part.
    photo = models.ImageField(upload_to="eleves/photos/", null=True, blank=True)

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


class Trimestre(models.TextChoices):
    T1 = "T1", "1er trimestre"
    T2 = "T2", "2e trimestre"
    T3 = "T3", "3e trimestre"


class Note(models.Model):
    """US-7.1 : note par matière et par période (§7.1). US-7.5 : verrouillage
    après transmission au directeur — une note verrouillée n'est plus
    modifiable par l'enseignant (perform_update le vérifie), seulement par le
    Directeur d'école ou le Super Admin."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    eleve = models.ForeignKey(Eleve, on_delete=models.CASCADE, related_name="notes")
    matiere = models.CharField(max_length=100)  # texte libre, cohérent avec InterventionEnseignant.matiere
    trimestre = models.CharField(max_length=2, choices=Trimestre.choices)
    type_evaluation = models.CharField(max_length=60, default="Devoir")  # "Devoir 1", "Composition"...
    valeur = models.DecimalField(max_digits=4, decimal_places=2)  # /20
    verrouille = models.BooleanField(default=False)
    annee_academique = models.CharField(max_length=9, default="2026-2027")
    saisi_par = models.ForeignKey(
        "usr.Utilisateur", on_delete=models.SET_NULL, null=True, blank=True, related_name="notes_saisies"
    )

    cree_le = models.DateTimeField(auto_now_add=True)
    modifie_le = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = '"ped"."note"'
        verbose_name = "Note"
        verbose_name_plural = "Notes"
        ordering = ["-annee_academique", "trimestre", "matiere"]
        indexes = [
            models.Index(fields=["eleve", "annee_academique", "trimestre"], name="idx_note_eleve_periode"),
        ]
        constraints = [
            # Empêche la double saisie du même devoir pour le même élève — le
            # frontend PATCH la note existante plutôt que d'en recréer une.
            models.UniqueConstraint(
                fields=["eleve", "matiere", "trimestre", "type_evaluation", "annee_academique"],
                name="uq_note_eleve_matiere_trimestre_evaluation",
            ),
        ]

    def __str__(self):
        return f"{self.eleve.nom_complet} — {self.matiere} ({self.trimestre}) : {self.valeur}/20"


class Presence(models.Model):
    """US-7.4 : appel, une ligne par élève/classe/matière/jour."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    eleve = models.ForeignKey(Eleve, on_delete=models.CASCADE, related_name="presences")
    classe = models.ForeignKey("ref.Classe", on_delete=models.PROTECT, related_name="presences")
    matiere = models.CharField(max_length=100)
    date = models.DateField()
    present = models.BooleanField(default=True)
    enregistre_par = models.ForeignKey(
        "usr.Utilisateur", on_delete=models.SET_NULL, null=True, blank=True, related_name="presences_enregistrees"
    )
    cree_le = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = '"ped"."presence"'
        verbose_name = "Présence"
        verbose_name_plural = "Présences"
        ordering = ["-date"]
        constraints = [
            models.UniqueConstraint(
                fields=["eleve", "classe", "matiere", "date"], name="uq_presence_eleve_classe_matiere_date"
            ),
        ]

    def __str__(self):
        etat = "présent" if self.present else "absent"
        return f"{self.eleve.nom_complet} — {self.date} ({etat})"


class ResultatExamen(models.TextChoices):
    EN_ATTENTE = "en_attente", "En attente"
    ADMIS = "admis", "Admis"
    ECHEC = "echec", "Échec"


class InscriptionExamen(models.Model):
    """US-8.2/US-8.3 : inscription d'un élève à un examen national et son
    résultat, une fois délibéré."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    eleve = models.ForeignKey(Eleve, on_delete=models.CASCADE, related_name="inscriptions_examens")
    type_examen = models.CharField(max_length=10, choices=[("CEP", "CEP"), ("BEPC", "BEPC"), ("BAC", "BAC")])
    annee_academique = models.CharField(max_length=9, default="2026-2027")
    numero_candidat = models.CharField(max_length=30, unique=True, blank=True)  # GN-<EXAMEN>-<année>-<NNNNNN>
    resultat = models.CharField(max_length=15, choices=ResultatExamen.choices, default=ResultatExamen.EN_ATTENTE)
    moyenne_examen = models.DecimalField(max_digits=4, decimal_places=2, null=True, blank=True)
    date_resultat = models.DateField(null=True, blank=True)

    cree_le = models.DateTimeField(auto_now_add=True)
    modifie_le = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = '"ped"."inscription_examen"'
        verbose_name = "Inscription à un examen"
        verbose_name_plural = "Inscriptions aux examens"
        ordering = ["-annee_academique"]
        constraints = [
            models.UniqueConstraint(
                fields=["eleve", "type_examen", "annee_academique"], name="uq_inscription_eleve_examen_annee"
            ),
        ]

    def __str__(self):
        return f"{self.numero_candidat} — {self.eleve.nom_complet} ({self.type_examen})"

    def _generer_numero(self) -> str:
        annee = datetime.date.today().year
        base = f"GN-{self.type_examen}-{annee}-"
        n = InscriptionExamen.objects.filter(numero_candidat__startswith=base).count() + 1
        return f"{base}{n:06d}"

    def save(self, *args, **kwargs):
        if not self.numero_candidat:
            self.numero_candidat = self._generer_numero()
        super().save(*args, **kwargs)


class StatutDeliberation(models.TextChoices):
    ADMIS = "admis", "Admis"
    REDOUBLANT = "redoublant", "Redoublant"
    EXAMEN_NATIONAL_REQUIS = "examen_national_requis", "Examen national requis"
    EXCLU = "exclu", "Exclu"


class Deliberation(models.Model):
    """US-8.4 : décision de fin d'année, une par élève et par année
    académique — moyenne_generale est pré-calculée depuis Note au moment de
    la création (voir ped/services.py) mais reste modifiable."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    eleve = models.ForeignKey(Eleve, on_delete=models.CASCADE, related_name="deliberations")
    annee_academique = models.CharField(max_length=9, default="2026-2027")
    moyenne_generale = models.DecimalField(max_digits=4, decimal_places=2, null=True, blank=True)
    statut = models.CharField(max_length=25, choices=StatutDeliberation.choices)
    motif = models.TextField(blank=True)
    decide_par = models.ForeignKey(
        "usr.Utilisateur", on_delete=models.SET_NULL, null=True, blank=True, related_name="deliberations_decidees"
    )
    date_deliberation = models.DateField(auto_now_add=True)

    class Meta:
        db_table = '"ped"."deliberation"'
        verbose_name = "Délibération"
        verbose_name_plural = "Délibérations"
        ordering = ["-annee_academique"]
        constraints = [
            models.UniqueConstraint(fields=["eleve", "annee_academique"], name="uq_deliberation_eleve_annee"),
        ]

    def __str__(self):
        return f"{self.eleve.nom_complet} — {self.annee_academique} : {self.get_statut_display()}"
