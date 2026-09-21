"""Point d'entrée unique pour écrire dans le journal d'activité (US-2.4, US-13.4)."""
from .models import JournalActivite


def consigner(*, acteur, action: str, cible_type: str = "", cible_id="", detail: str = "") -> JournalActivite:
    return JournalActivite.objects.create(
        acteur=acteur,
        action=action,
        cible_type=cible_type,
        cible_id=str(cible_id) if cible_id else "",
        detail=detail,
    )
