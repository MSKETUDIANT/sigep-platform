"""Règle de polyvalence des enseignants (confirmée 2026-09-25 par le rapport
officiel sur l'enseignement guinéen) : au primaire, un enseignant est
polyvalent et titulaire d'une seule classe (toutes matières) ; au secondaire,
les enseignants sont spécialisés par matière, plusieurs affectations actives
sont possibles mais jamais mélangées avec le primaire. Voir
usr.models.InterventionEnseignant pour le détail de la règle.

Catalogue de matières (confirmé 2026-09-25) : pas de filière (SM/SS/Lettres)
distinguée pour l'instant au lycée — les matières dominantes des 3 filières
sont regroupées dans une seule liste, à affiner si le filtrage par filière
est demandé plus tard."""
from rest_framework.exceptions import ValidationError

LIMITE_INTERVENTIONS_SECONDAIRE = 4

MATIERES_COLLEGE = [
    "Français", "Mathématiques", "Physique", "Chimie", "Biologie",
    "Histoire", "Géographie", "Éducation Civique et Morale", "Anglais",
    "Éducation Physique et Sportive",
]
# 4 transversales (toutes filières) + 7 dominantes (Sciences Mathématiques,
# Sciences Expérimentales, Sciences Sociales confondues, pas encore filtrées).
MATIERES_LYCEE = [
    "Français", "Anglais", "Philosophie", "Éducation Physique et Sportive",
    "Mathématiques", "Physique", "Chimie", "Sciences de la Vie et de la Terre",
    "Histoire", "Géographie", "Économie",
]
MATIERES_PAR_CYCLE = {"college": MATIERES_COLLEGE, "lycee": MATIERES_LYCEE}
TOUTES_MATIERES_OFFICIELLES = sorted(set(MATIERES_COLLEGE) | set(MATIERES_LYCEE))


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
    liste = MATIERES_PAR_CYCLE[classe.cycle.code]
    if matiere not in liste:
        raise ValidationError(f"Matière invalide pour ce cycle. Choix possibles : {', '.join(liste)}.")
    return matiere
