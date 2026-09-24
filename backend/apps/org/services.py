"""Règle de périmètre partagée (US-3.4, US-4.5) : quelles écoles un profil
connecté peut voir. Réutilisée par org.Ecole, ped.Eleve/Filiation et
trv.Equipement — tous filtrés "par école visible"."""
from .models import AffectationResponsable, Ecole

PROFILS_VUE_NATIONALE = {"super_admin", "dge", "ministre", "cabinet"}


def ecoles_visibles(user):
    if user.profil in PROFILS_VUE_NATIONALE:
        return Ecole.objects.all()

    # Les 5 profils territoriaux (dont directeur_ecole) partagent le même
    # mécanisme d'affectation (org.AffectationResponsable, cf. son
    # chk_affectation_perimetre qui accepte déjà profil=directeur_ecole +
    # ecole) — Super Admin les affecte tous depuis /espace/comptes.
    affectation = AffectationResponsable.objects.filter(
        utilisateur=user, statut="actif", date_fin__isnull=True
    ).first()
    if not affectation:
        return Ecole.objects.none()
    if user.profil == "directeur_ecole":
        return Ecole.objects.filter(id=affectation.ecole_id)
    if user.profil == "dse":
        return Ecole.objects.filter(sous_prefecture=affectation.sous_prefecture)
    if user.profil == "dce":
        return Ecole.objects.filter(commune=affectation.commune)
    if user.profil == "dpe":
        return Ecole.objects.filter(prefecture=affectation.prefecture)
    if user.profil == "ir":
        return Ecole.objects.filter(region=affectation.region)
    return Ecole.objects.none()
