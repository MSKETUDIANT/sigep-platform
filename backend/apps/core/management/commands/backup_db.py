"""US-2.8 : sauvegarde de la base PostgreSQL via pg_dump.

Usage :
    python manage.py backup_db

Pour une sauvegarde quotidienne automatique (§16.3, "Sauvegardes"), planifier
via cron (Linux/serveur) :
    0 2 * * * docker compose exec -T backend python manage.py backup_db
ou le Planificateur de tâches Windows si exécuté hors Docker.

Restauration :
    pg_restore -h <host> -U sigep -d sigep_db --clean backend/backups/sigep_YYYYMMDD_HHMMSS.dump
"""
import datetime
import os
import subprocess

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError


class Command(BaseCommand):
    help = "Sauvegarde la base PostgreSQL (pg_dump, format custom, restaurable avec pg_restore)."

    def handle(self, *args, **options):
        db = settings.DATABASES["default"]
        backup_dir = settings.BASE_DIR / "backups"
        backup_dir.mkdir(exist_ok=True)

        horodatage = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        fichier = backup_dir / f"sigep_{horodatage}.dump"

        env = os.environ.copy()
        env["PGPASSWORD"] = db["PASSWORD"]
        commande = [
            "pg_dump",
            "-h", db["HOST"],
            "-p", str(db["PORT"]),
            "-U", db["USER"],
            "-F", "c",
            "-f", str(fichier),
            db["NAME"],
        ]

        self.stdout.write(f"Sauvegarde en cours vers {fichier} ...")
        try:
            subprocess.run(commande, env=env, check=True, capture_output=True, text=True)
        except FileNotFoundError as exc:
            raise CommandError(
                "pg_dump introuvable. À exécuter dans le conteneur backend "
                "(image postgresql-client) ou avec les outils PostgreSQL "
                "installés localement."
            ) from exc
        except subprocess.CalledProcessError as exc:
            raise CommandError(f"Échec de pg_dump : {exc.stderr}") from exc

        self.stdout.write(self.style.SUCCESS(f"Sauvegarde terminée : {fichier}"))
