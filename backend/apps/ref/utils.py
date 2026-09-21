"""Génération des codes territoriaux auto (US-1.3, US-1.5).

Formats cibles (voir §2.4-2.5 du dossier fonctionnel) :
    Sous-préfecture : GN-<RÉGION>-SP-<SUFFIXE>   ex. GN-KIN-SP-FRI
    Quartier        : GN-<RÉGION>-Q-<SUFFIXE>    ex. GN-CNK-Q-BLB
"""
import re
import unicodedata


def normaliser_ascii(texte: str) -> str:
    """Retire les accents et ne conserve que les caractères alphanumériques, en majuscules."""
    nfkd = unicodedata.normalize("NFKD", texte or "")
    sans_accents = nfkd.encode("ascii", "ignore").decode("ascii")
    return re.sub(r"[^A-Za-z0-9]", "", sans_accents).upper()


def generer_suffixe_code(nom: str, longueur: int = 3) -> str:
    base = normaliser_ascii(nom)
    if len(base) >= longueur:
        return base[:longueur]
    return base.ljust(longueur, "X")


def code_region_depuis(code_region: str) -> str:
    """Extrait les 3 lettres de région à partir d'un code du type GN-XXX[-...]."""
    parties = (code_region or "").split("-")
    return parties[1] if len(parties) > 1 else "XXX"


def generer_code_unique(queryset_model, base_code: str, *, exclude_pk=None) -> str:
    """Retourne base_code s'il est libre, sinon l'incrémente (…2, …3, ...)."""
    code = base_code
    compteur = 1
    manager = queryset_model.objects
    while manager.filter(code=code).exclude(pk=exclude_pk).exists():
        compteur += 1
        suffixe_num = str(compteur)
        code = f"{base_code}{suffixe_num}"
    return code
