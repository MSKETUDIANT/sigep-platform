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
