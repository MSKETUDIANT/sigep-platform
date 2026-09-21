"""L'app core regroupe l'infrastructure transversale (schémas, extensions,
endpoints techniques) et les paramètres système (US-2.9) — ce dernier ne
correspond à aucun des 8 schémas métier, il reste donc en schéma "public"."""
import uuid

from django.db import models


class ParametreSysteme(models.Model):
    """Configuration modifiable par le Super Admin sans intervention technique
    (US-2.9) : rôles/droits par défaut, activation OTP globale, seuils de
    notification, etc. — clé/valeur volontairement générique."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    cle = models.CharField(max_length=100, unique=True)
    valeur = models.TextField()
    description = models.CharField(max_length=255, blank=True)
    modifie_le = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Paramètre système"
        verbose_name_plural = "Paramètres système"
        ordering = ["cle"]

    def __str__(self):
        return self.cle
