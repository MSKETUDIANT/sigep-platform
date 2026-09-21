"""
Domaine Audit — schéma PostgreSQL "aud".

Sprint 2 : version minimale du journal d'activité, nécessaire pour tracer les
créations de compte, réaffectations et révocations (US-2.4 : "Réaffectation
tracée dans le journal d'activité"). La version complète (filtrage avancé,
rétention, export) est prévue à l'EPIC 13 / Sprint 9 (US-13.4).
"""
import uuid

from django.db import models


class JournalActivite(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    acteur = models.ForeignKey(
        "usr.Utilisateur", on_delete=models.SET_NULL, null=True, blank=True, related_name="actions_journal"
    )
    action = models.CharField(max_length=50)  # ex. creation_compte, reaffectation_responsable, revocation_compte
    cible_type = models.CharField(max_length=100, blank=True)  # ex. "usr.Utilisateur"
    cible_id = models.CharField(max_length=64, blank=True)
    detail = models.TextField(blank=True)
    horodatage = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = '"aud"."journal_activite"'
        verbose_name = "Entrée du journal d'activité"
        verbose_name_plural = "Journal d'activité"
        ordering = ["-horodatage"]
        indexes = [
            models.Index(fields=["-horodatage"], name="idx_journal_horodatage"),
            models.Index(fields=["action"], name="idx_journal_action"),
        ]

    def __str__(self):
        return f"{self.horodatage:%Y-%m-%d %H:%M} · {self.action} · {self.cible_type}#{self.cible_id}"
