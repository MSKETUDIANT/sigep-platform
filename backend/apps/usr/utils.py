"""US-2.2 : génération d'un mot de passe provisoire lors de la création d'un compte."""
import secrets
import string


def generer_mot_de_passe_provisoire(longueur: int = 12) -> str:
    alphabet = string.ascii_letters + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(longueur))
