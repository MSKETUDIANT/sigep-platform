"""Données de référence fixes (§14.1 du dossier fonctionnel) : 3 cycles, 13 classes."""
import uuid

from django.db import migrations

CYCLES = [
    {"code": "primaire", "libelle": "Primaire", "duree_annees": 6, "ordre": 1, "examen_fin": "CEP"},
    {"code": "college", "libelle": "Collège", "duree_annees": 4, "ordre": 2, "examen_fin": "BEPC"},
    {"code": "lycee", "libelle": "Lycée", "duree_annees": 3, "ordre": 3, "examen_fin": "BAC"},
]

CLASSES = [
    # (code, libelle, cycle_code, niveau, ordre_global, est_classe_fin)
    ("CP1", "CP1", "primaire", 1, 1, False),
    ("CP2", "CP2", "primaire", 2, 2, False),
    ("CE1", "CE1", "primaire", 3, 3, False),
    ("CE2", "CE2", "primaire", 4, 4, False),
    ("CM1", "CM1", "primaire", 5, 5, False),
    ("CM2", "CM2", "primaire", 6, 6, True),
    ("7E", "7e", "college", 1, 7, False),
    ("8E", "8e", "college", 2, 8, False),
    ("9E", "9e", "college", 3, 9, False),
    ("10E", "10e", "college", 4, 10, True),
    ("11E", "11e", "lycee", 1, 11, False),
    ("12E", "12e", "lycee", 2, 12, False),
    ("TERMINALE", "Terminale", "lycee", 3, 13, True),
]


def seed(apps, schema_editor):
    Cycle = apps.get_model("ref", "Cycle")
    Classe = apps.get_model("ref", "Classe")

    cycles_par_code = {}
    for c in CYCLES:
        cycle = Cycle.objects.create(id=uuid.uuid4(), **c)
        cycles_par_code[c["code"]] = cycle

    for code, libelle, cycle_code, niveau, ordre, fin in CLASSES:
        Classe.objects.create(
            id=uuid.uuid4(),
            cycle=cycles_par_code[cycle_code],
            code=code,
            libelle=libelle,
            niveau=niveau,
            ordre=ordre,
            est_classe_fin=fin,
        )


def retirer(apps, schema_editor):
    apps.get_model("ref", "Classe").objects.all().delete()
    apps.get_model("ref", "Cycle").objects.all().delete()


class Migration(migrations.Migration):
    dependencies = [("ref", "0003_cycle_classe")]
    operations = [migrations.RunPython(seed, reverse_code=retirer)]
