"""
Domaine Transversal — schéma PostgreSQL "trv".

Sprint 3 (EPIC 4, US-4.4) : trv.Equipement — inventaire d'une école (§6.5).
Signalements et inspections restent prévus au Sprint 4 ; messagerie et
notifications au Sprint 9. Voir SIGEP_Backlog_Sprints.pdf.
"""
import uuid

from django.db import models


class Equipement(models.Model):
    """US-4.4 : inventaire d'équipements d'une école (§6.5 — Tables-bancs,
    Tableaux noirs, Ordinateurs, Manuels scolaires, etc.)."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    ecole = models.ForeignKey("org.Ecole", on_delete=models.CASCADE, related_name="equipements")
    type_equipement = models.CharField(max_length=100)
    total = models.IntegerField(default=0)
    fonctionnel = models.IntegerField(default=0)
    a_reparer = models.IntegerField(default=0)

    cree_le = models.DateTimeField(auto_now_add=True)
    modifie_le = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = '"trv"."equipement"'
        verbose_name = "Équipement"
        verbose_name_plural = "Équipements"
        ordering = ["ecole", "type_equipement"]
        constraints = [
            models.UniqueConstraint(fields=["ecole", "type_equipement"], name="uq_equipement_ecole_type"),
            models.CheckConstraint(
                name="chk_equipement_total_coherent",
                check=models.Q(fonctionnel__lte=models.F("total")),
            ),
        ]

    def __str__(self):
        return f"{self.type_equipement} — {self.ecole.nom}"
