"""Permissions transversales — brique de base de la matrice des droits (US-2.6, §17)."""
from rest_framework.permissions import SAFE_METHODS, BasePermission


class EstSuperAdmin(BasePermission):
    """Réservé au Super Admin (gestion des comptes et des affectations — §2.3)."""

    message = "Action réservée au Super Admin."

    def has_permission(self, request, view):
        return bool(
            request.user and request.user.is_authenticated and request.user.profil == "super_admin"
        )


class LectureAuthentifieEcritureSuperAdmin(BasePermission):
    """Lecture ouverte à tout compte authentifié, écriture réservée au Super Admin.

    Utilisé pour le référentiel territorial (apps.ref) : la création de
    sous-préfectures/quartiers/etc. est un privilège du Super Admin (§2.3),
    mais tous les profils doivent pouvoir consulter le découpage territorial.
    """

    message = "Modification réservée au Super Admin."

    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        if request.method in SAFE_METHODS:
            return True
        return request.user.profil == "super_admin"


class LectureAuthentifieEcritureSuperAdminOuDirecteurEcole(BasePermission):
    """Comme LectureAuthentifieEcritureSuperAdmin, mais le Directeur d'école a
    aussi le droit d'écrire (§6.1/§17 du dossier fonctionnel : "Gérer les
    enseignants/élèves/équipements" dans son tableau de bord — "Dir. école"
    a ●●☑ sur Enseignants/Élèves dans la matrice des droits, contrairement
    aux autres profils territoriaux qui restent lecture seule à ce niveau).

    N'autorise PAS à choisir n'importe quelle école dans le payload : chaque
    ViewSet qui utilise cette permission doit lui-même vérifier, dans son
    perform_create/perform_update, que l'école visée fait partie de
    ecoles_visibles(request.user) — cette permission ne fait que lever la
    porte d'entrée (méthode HTTP), pas la vérification du contenu."""

    message = "Modification réservée au Super Admin ou au Directeur de l'école concernée."

    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        if request.method in SAFE_METHODS:
            return True
        return request.user.profil in ("super_admin", "directeur_ecole")


class LectureAuthentifieEcritureSuperAdminDirecteurOuEnseignant(BasePermission):
    """Sprint 5 (EPIC 7) : comme LectureAuthentifieEcritureSuperAdminOuDirecteurEcole,
    mais l'Enseignant peut aussi écrire — Note/Presence sont saisies par
    l'enseignant lui-même (§7.1 : "Notes, appel"), pas seulement par le
    Directeur. Là encore, cette permission ne fait que lever la porte
    d'entrée : chaque ViewSet doit vérifier dans perform_create/perform_update
    que l'enseignant a bien une InterventionEnseignant active correspondant à
    l'école/classe/matière visée (un enseignant ne peut pas noter n'importe
    quel élève)."""

    message = "Modification réservée au Super Admin, au Directeur de l'école concernée ou à l'enseignant de la classe."

    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        if request.method in SAFE_METHODS:
            return True
        return request.user.profil in ("super_admin", "directeur_ecole", "enseignant")
