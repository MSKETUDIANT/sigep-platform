"""Bulletin et livret scolaire (US-7.2/US-7.3) : agrégats calculés à la volée
depuis Note, jamais stockés — toujours cohérents avec les notes réellement
saisies, pas de resynchronisation à gérer."""
from django.db.models import Avg

from .models import Deliberation, InscriptionExamen, Note


def bulletin(eleve, annee_academique: str, trimestre: str) -> dict:
    """US-7.2 : moyenne par matière + moyenne générale du trimestre, à partir
    des Note existantes. Simplification assumée : moyenne simple des notes
    d'une matière (pas de pondération devoir/composition)."""
    notes = Note.objects.filter(eleve=eleve, annee_academique=annee_academique, trimestre=trimestre)
    par_matiere = (
        notes.values("matiere").annotate(moyenne=Avg("valeur")).order_by("matiere")
    )
    matieres = [{"matiere": m["matiere"], "moyenne": round(float(m["moyenne"]), 2)} for m in par_matiere]
    moyenne_generale = round(sum(m["moyenne"] for m in matieres) / len(matieres), 2) if matieres else None
    return {
        "eleve_id": str(eleve.id),
        "annee_academique": annee_academique,
        "trimestre": trimestre,
        "matieres": matieres,
        "moyenne_generale": moyenne_generale,
    }


def moyenne_generale_annee(eleve, annee_academique: str):
    """Moyenne de l'année (tous trimestres confondus) — sert à pré-remplir
    Deliberation.moyenne_generale, reste modifiable ensuite."""
    agg = Note.objects.filter(eleve=eleve, annee_academique=annee_academique).aggregate(m=Avg("valeur"))
    return round(agg["m"], 2) if agg["m"] is not None else None


def livret(eleve) -> dict:
    """US-7.3 : historique complet de la scolarité — un bulletin par
    année/trimestre où l'élève a des notes, plus délibérations et résultats
    d'examens."""
    annees_trimestres = (
        Note.objects.filter(eleve=eleve)
        .values_list("annee_academique", "trimestre")
        .distinct()
        .order_by("annee_academique", "trimestre")
    )
    bulletins = [bulletin(eleve, annee, trimestre) for annee, trimestre in annees_trimestres]
    deliberations = list(
        Deliberation.objects.filter(eleve=eleve)
        .order_by("annee_academique")
        .values("annee_academique", "moyenne_generale", "statut", "motif", "date_deliberation")
    )
    examens = list(
        InscriptionExamen.objects.filter(eleve=eleve)
        .order_by("annee_academique")
        .values(
            "annee_academique", "type_examen", "numero_candidat", "resultat", "moyenne_examen", "date_resultat"
        )
    )
    return {
        "eleve_id": str(eleve.id),
        "eleve_nom": eleve.nom_complet,
        "bulletins": bulletins,
        "deliberations": deliberations,
        "examens": examens,
    }
