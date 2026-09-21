from django.db import connection
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response


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
