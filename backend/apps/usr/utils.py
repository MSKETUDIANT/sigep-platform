"""US-2.2 : génération d'un mot de passe provisoire lors de la création d'un compte.
US-2.10 : génération/envoi d'un code OTP par email (décision utilisateur —
pas de fournisseur SMS retenu, l'OTP part par email à la place)."""
import secrets
import string

from django.conf import settings
from django.core.mail import send_mail
from django.utils import timezone


def generer_mot_de_passe_provisoire(longueur: int = 12) -> str:
    alphabet = string.ascii_letters + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(longueur))


def generer_code_otp() -> str:
    return "".join(secrets.choice(string.digits) for _ in range(6))


def envoyer_otp(utilisateur) -> str:
    """Génère un nouveau code, le stocke (avec expiration) sur le compte, et
    l'envoie par email. Retourne le code — uniquement pour les tests/logs,
    jamais renvoyé dans une réponse API destinée au client."""
    code = generer_code_otp()
    utilisateur.otp_secret = code
    utilisateur.otp_expire_le = timezone.now() + timezone.timedelta(minutes=settings.OTP_VALIDITE_MINUTES)
    utilisateur.save(update_fields=["otp_secret", "otp_expire_le"])

    send_mail(
        subject="SIGEP — Code d'activation de votre compte",
        message=(
            f"Bonjour {utilisateur.prenoms},\n\n"
            f"Votre code d'activation SIGEP est : {code}\n\n"
            f"Ce code est valable {settings.OTP_VALIDITE_MINUTES} minutes.\n\n"
            "Si vous n'êtes pas à l'origine de cette demande, ignorez cet email."
        ),
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[utilisateur.email],
        fail_silently=False,
    )
    return code
