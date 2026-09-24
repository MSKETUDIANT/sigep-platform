from django.db.models import Q
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response
from rest_framework import viewsets

from apps.core.permissions import (
    LectureAuthentifieEcritureSuperAdminDirecteurOuEnseignant,
    LectureAuthentifieEcritureSuperAdminOuDirecteurEcole,
)
from apps.org.services import PROFILS_VUE_NATIONALE, ecoles_visibles

from . import services
from .models import Deliberation, Eleve, Filiation, InscriptionExamen, Note, Presence
from .serializers import (
    DeliberationSerializer,
    EleveSerializer,
    FiliationSerializer,
    InscriptionExamenSerializer,
    NoteSerializer,
    PresenceSerializer,
)


def _q_eleves_enseignant(user, ecole_field="ecole_id", classe_field="classe_id"):
    """Q object matchant les lignes des (école, classe) où ce profil
    enseignant a une InterventionEnseignant active. `ref.Classe` est un
    référentiel national partagé ("8e" existe à l'identique dans chaque
    école) — filtrer sur classe_id seul matcherait tous les 8e du pays, il
    faut apparier école ET classe ensemble, intervention par intervention.
    `ecole_field`/`classe_field` permettent de réutiliser ce Q sur un modèle
    qui n'a pas ces deux champs au même niveau (ex. Presence a `classe` en
    direct mais `ecole` seulement via `eleve__ecole`). ecoles_visibles() ne
    couvre pas ce profil (pas de périmètre territorial), d'où ce chemin
    dédié."""
    fiche = getattr(user, "fiche_enseignant", None)
    if not fiche:
        return Q(pk__isnull=True)  # aucune ligne ne matche jamais
    paires = fiche.interventions.filter(actif=True).values("ecole_id", "classe_id").distinct()
    q = Q(pk__isnull=True)
    for p in paires:
        q |= Q(**{ecole_field: p["ecole_id"], classe_field: p["classe_id"]})
    return q


def _enseignant_habilite(user, ecole, classe, matiere) -> bool:
    """Un enseignant du primaire est polyvalent — son InterventionEnseignant a
    matiere="" ("toutes matières", voir usr.services.valider_polyvalence) et
    l'habilite donc pour N'IMPORTE QUELLE matière sur sa classe, pas
    seulement une correspondance exacte comme au secondaire."""
    fiche = getattr(user, "fiche_enseignant", None)
    if not fiche:
        return False
    return fiche.interventions.filter(actif=True, ecole=ecole, classe=classe).filter(
        Q(matiere=matiere) | Q(matiere="")
    ).exists()


class EleveViewSet(viewsets.ModelViewSet):
    """US-4.3 (création) et US-4.5 (liste bornée au périmètre). Écriture
    ouverte au Directeur d'École (§6.1/§17), borné à sa propre école : voir
    perform_create/perform_update."""

    serializer_class = EleveSerializer
    permission_classes = [LectureAuthentifieEcritureSuperAdminOuDirecteurEcole]
    search_fields = ["matricule", "nom", "prenoms"]
    filterset_fields = ["ecole", "classe", "statut", "sexe"]

    def get_queryset(self):
        qs = Eleve.objects.select_related("ecole", "classe").prefetch_related("filiations")
        user = self.request.user
        # Un enseignant n'a pas de périmètre territorial (ecoles_visibles()
        # renvoie vide pour ce profil) — sa portée, ce sont les classes où il
        # a une InterventionEnseignant active (US-7.1 : il doit pouvoir
        # lister ses élèves pour saisir des notes/faire l'appel).
        if user.profil == "enseignant":
            return qs.filter(_q_eleves_enseignant(user))
        return qs.filter(ecole__in=ecoles_visibles(user))

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

    @action(detail=True, methods=["get"])
    def bulletin(self, request, pk=None):
        """US-7.2 : moyenne par matière + moyenne générale, calculées à la
        volée depuis Note (pas une table stockée — voir ped/services.py)."""
        eleve = self.get_object()
        annee = request.query_params.get("annee_academique", eleve.annee_academique)
        trimestre = request.query_params.get("trimestre", "T1")
        return Response(services.bulletin(eleve, annee, trimestre))

    @action(detail=True, methods=["get"])
    def livret(self, request, pk=None):
        """US-7.3 : historique complet de la scolarité (tous les bulletins,
        délibérations et résultats d'examens de l'élève)."""
        eleve = self.get_object()
        return Response(services.livret(eleve))


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


class NoteViewSet(viewsets.ModelViewSet):
    """US-7.1 (saisie) / US-7.5 (verrouillage). Écriture ouverte au Super
    Admin, au Directeur d'école (sa propre école) et à l'Enseignant, mais
    borné pour ce dernier à ses InterventionEnseignant actives — il ne peut
    pas noter un élève hors de ses propres classe/matière."""

    serializer_class = NoteSerializer
    permission_classes = [LectureAuthentifieEcritureSuperAdminDirecteurOuEnseignant]
    filterset_fields = ["eleve", "matiere", "trimestre", "annee_academique", "verrouille"]

    def get_queryset(self):
        qs = Note.objects.select_related("eleve", "saisi_par")
        user = self.request.user
        if user.profil == "enseignant":
            return qs.filter(_q_eleves_enseignant(user, "eleve__ecole_id", "eleve__classe_id"))
        if user.profil in PROFILS_VUE_NATIONALE:
            return qs
        return qs.filter(eleve__ecole__in=ecoles_visibles(user))

    def _verifier_habilitation(self, eleve, matiere):
        user = self.request.user
        if user.profil == "super_admin":
            return
        if user.profil == "directeur_ecole":
            if not eleve or eleve.ecole not in ecoles_visibles(user):
                raise PermissionDenied("Cet élève n'est pas dans votre périmètre.")
            return
        if user.profil == "enseignant":
            if not eleve or not _enseignant_habilite(user, eleve.ecole, eleve.classe, matiere):
                raise PermissionDenied(
                    "Vous n'avez pas d'intervention active pour cet élève et cette matière."
                )
            return
        raise PermissionDenied("Profil non autorisé à saisir des notes.")

    def perform_create(self, serializer):
        eleve = serializer.validated_data.get("eleve")
        matiere = serializer.validated_data.get("matiere")
        self._verifier_habilitation(eleve, matiere)
        serializer.save(saisi_par=self.request.user)

    def perform_update(self, serializer):
        instance = serializer.instance
        if instance.verrouille and self.request.user.profil == "enseignant":
            raise PermissionDenied("Cette note est verrouillée, elle ne peut plus être modifiée.")
        eleve = serializer.validated_data.get("eleve", instance.eleve)
        matiere = serializer.validated_data.get("matiere", instance.matiere)
        self._verifier_habilitation(eleve, matiere)
        serializer.save()

    @action(detail=False, methods=["post"])
    def transmettre(self, request):
        """US-7.5 : un enseignant verrouille d'un coup toutes ses notes d'une
        classe/matière/trimestre — Directeur/Super Admin peuvent aussi
        transmettre (ex. correction groupée après coup)."""
        user = request.user
        classe_id = request.data.get("classe")
        matiere = request.data.get("matiere")
        trimestre = request.data.get("trimestre")
        annee_academique = request.data.get("annee_academique")
        if not all([classe_id, matiere, trimestre, annee_academique]):
            raise ValidationError("classe, matiere, trimestre et annee_academique sont obligatoires.")

        if user.profil == "enseignant":
            fiche = getattr(user, "fiche_enseignant", None)
            # matiere="" sur l'intervention = enseignant polyvalent du primaire,
            # habilité pour n'importe quelle matière de notes (voir _enseignant_habilite).
            if not fiche or not fiche.interventions.filter(actif=True, classe_id=classe_id).filter(
                Q(matiere=matiere) | Q(matiere="")
            ).exists():
                raise PermissionDenied("Vous n'avez pas d'intervention active pour cette classe et cette matière.")
        elif user.profil not in ("super_admin", "directeur_ecole"):
            raise PermissionDenied("Profil non autorisé à transmettre des notes.")

        notes = self.get_queryset().filter(
            eleve__classe_id=classe_id, matiere=matiere, trimestre=trimestre, annee_academique=annee_academique
        )
        n = notes.update(verrouille=True)
        return Response({"detail": f"{n} note(s) transmise(s) et verrouillée(s)."})


class PresenceViewSet(viewsets.ModelViewSet):
    """US-7.4 : appel, mêmes règles de périmètre que Note."""

    serializer_class = PresenceSerializer
    permission_classes = [LectureAuthentifieEcritureSuperAdminDirecteurOuEnseignant]
    filterset_fields = ["eleve", "classe", "matiere", "date"]

    def get_queryset(self):
        qs = Presence.objects.select_related("eleve", "classe")
        user = self.request.user
        if user.profil == "enseignant":
            return qs.filter(_q_eleves_enseignant(user, "eleve__ecole_id", "classe_id"))
        if user.profil in PROFILS_VUE_NATIONALE:
            return qs
        return qs.filter(eleve__ecole__in=ecoles_visibles(user))

    def _verifier_habilitation(self, eleve, classe, matiere):
        user = self.request.user
        if user.profil == "super_admin":
            return
        if user.profil == "directeur_ecole":
            if not eleve or eleve.ecole not in ecoles_visibles(user):
                raise PermissionDenied("Cet élève n'est pas dans votre périmètre.")
            return
        if user.profil == "enseignant":
            ecole = eleve.ecole if eleve else None
            if not ecole or not _enseignant_habilite(user, ecole, classe, matiere):
                raise PermissionDenied(
                    "Vous n'avez pas d'intervention active pour cette classe et cette matière."
                )
            return
        raise PermissionDenied("Profil non autorisé à faire l'appel.")

    def perform_create(self, serializer):
        eleve = serializer.validated_data.get("eleve")
        classe = serializer.validated_data.get("classe")
        matiere = serializer.validated_data.get("matiere")
        self._verifier_habilitation(eleve, classe, matiere)
        serializer.save(enregistre_par=self.request.user)

    def perform_update(self, serializer):
        instance = serializer.instance
        eleve = serializer.validated_data.get("eleve", instance.eleve)
        classe = serializer.validated_data.get("classe", instance.classe)
        matiere = serializer.validated_data.get("matiere", instance.matiere)
        self._verifier_habilitation(eleve, classe, matiere)
        serializer.save()


class InscriptionExamenViewSet(viewsets.ModelViewSet):
    """US-8.2/US-8.3 : réservé au Super Admin et au Directeur d'école (décision
    de fin de cycle, pas une saisie enseignant au quotidien)."""

    serializer_class = InscriptionExamenSerializer
    permission_classes = [LectureAuthentifieEcritureSuperAdminOuDirecteurEcole]
    filterset_fields = ["eleve", "type_examen", "annee_academique", "resultat"]

    def get_queryset(self):
        return InscriptionExamen.objects.select_related("eleve").filter(
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


class DeliberationViewSet(viewsets.ModelViewSet):
    """US-8.4 : décision de fin d'année, réservée au Super Admin et au
    Directeur d'école ("validation 1er niveau école" — §17)."""

    serializer_class = DeliberationSerializer
    permission_classes = [LectureAuthentifieEcritureSuperAdminOuDirecteurEcole]
    filterset_fields = ["eleve", "annee_academique", "statut"]

    def get_queryset(self):
        return Deliberation.objects.select_related("eleve").filter(
            eleve__ecole__in=ecoles_visibles(self.request.user)
        )

    def _verifier_eleve_dans_perimetre(self, eleve):
        user = self.request.user
        if user.profil in PROFILS_VUE_NATIONALE:
            return
        if not eleve or eleve.ecole not in ecoles_visibles(user):
            raise PermissionDenied("Cet élève n'est pas dans votre périmètre.")

    def perform_create(self, serializer):
        eleve = serializer.validated_data.get("eleve")
        self._verifier_eleve_dans_perimetre(eleve)
        annee = serializer.validated_data.get("annee_academique") or eleve.annee_academique
        moyenne = serializer.validated_data.get("moyenne_generale")
        if moyenne is None:
            moyenne = services.moyenne_generale_annee(eleve, annee)
        serializer.save(decide_par=self.request.user, moyenne_generale=moyenne)

    def perform_update(self, serializer):
        eleve = serializer.validated_data.get("eleve", serializer.instance.eleve)
        self._verifier_eleve_dans_perimetre(eleve)
        serializer.save(decide_par=self.request.user)
