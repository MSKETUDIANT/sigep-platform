import datetime
from pathlib import Path

from django.conf import settings
from django.core.management import call_command
from django.db import connection
from rest_framework import viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from .models import ParametreSysteme
from .permissions import EstSuperAdmin
from .serializers import ParametreSystemeSerializer


@api_view(["GET"])
@permission_classes([AllowAny])
def health_check(request):
    """Vérifie que l'API, la base de données et PostGIS répondent (US-0.3/0.4)."""
    with connection.cursor() as cursor:
        cursor.execute("SELECT postgis_version();")
        postgis_version = cursor.fetchone()[0]
        cursor.execute("SELECT schema_name FROM information_schema.schemata WHERE schema_name = ANY(%s);", [
            ["ref", "org", "usr", "ped", "ges", "trv", "aud", "sta"]
        ])
        schemas = sorted(row[0] for row in cursor.fetchall())

    return Response(
        {
            "status": "ok",
            "service": "SIGEP API",
            "postgis_version": postgis_version,
            "schemas_actifs": schemas,
        }
    )


class ParametreSystemeViewSet(viewsets.ModelViewSet):
    """US-2.9 : paramètres système, modifiables par le Super Admin sans intervention technique."""

    queryset = ParametreSysteme.objects.all()
    serializer_class = ParametreSystemeSerializer
    permission_classes = [EstSuperAdmin]
    search_fields = ["cle", "description"]


@api_view(["GET", "POST"])
@permission_classes([EstSuperAdmin])
def sauvegardes(request):
    """US-2.8 : POST déclenche `manage.py backup_db` (pg_dump), GET liste les sauvegardes existantes."""
    backup_dir = Path(settings.BASE_DIR) / "backups"
    backup_dir.mkdir(exist_ok=True)

    if request.method == "POST":
        call_command("backup_db")

    fichiers = sorted(backup_dir.glob("*.dump"), key=lambda f: f.stat().st_mtime, reverse=True)
    return Response(
        [
            {
                "nom": f.name,
                "taille_octets": f.stat().st_size,
                "cree_le": datetime.datetime.fromtimestamp(f.stat().st_mtime).isoformat(),
            }
            for f in fichiers
        ]
    )
