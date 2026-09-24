"""Règle de polyvalence des enseignants (confirmée 2026-09-25 par le rapport
officiel sur l'enseignement guinéen) : au primaire, un enseignant est
polyvalent et titulaire d'une seule classe (toutes matières) ; au secondaire,
les enseignants sont spécialisés par matière, plusieurs affectations actives
sont possibles mais jamais mélangées avec le primaire. Voir
usr.models.InterventionEnseignant pour le détail de la règle."""
from rest_framework.exceptions import ValidationError

LIMITE_INTERVENTIONS_SECONDAIRE = 4


def valider_polyvalence(enseignant, classe, matiere: str, *, exclude_pk=None) -> str:
    """Vérifie la règle de polyvalence pour une (nouvelle ou modifiée)
    intervention et renvoie la valeur de `matiere` à retenir réellement
    (vidée automatiquement au primaire, jamais laissée à ce que le client a
    envoyé)."""
    from .models import InterventionEnseignant

    actives = InterventionEnseignant.objects.filter(enseignant=enseignant, actif=True)
    if exclude_pk:
        actives = actives.exclude(pk=exclude_pk)

    if classe.cycle.code == "primaire":
        if actives.exists():
            raise ValidationError(
                "Un enseignant du primaire est polyvalent et titulaire d'une seule classe : "
                "cet enseignant a déjà une intervention active, désactivez-la d'abord pour le réaffecter."
            )
        return ""

    if actives.filter(classe__cycle__code="primaire").exists():
        raise ValidationError(
            "Cet enseignant est déjà titulaire d'une classe du primaire (polyvalent, une seule classe) — "
            "il ne peut pas cumuler avec une affectation au collège/lycée."
        )
    if actives.count() >= LIMITE_INTERVENTIONS_SECONDAIRE:
        raise ValidationError(
            f"Un enseignant du secondaire est limité à {LIMITE_INTERVENTIONS_SECONDAIRE} "
            "affectations actives à la fois."
        )
    if not matiere:
        raise ValidationError("La matière est obligatoire pour une affectation au collège ou au lycée.")
    return matiere
