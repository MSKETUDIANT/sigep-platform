"""Infrastructure de base : extensions PostgreSQL + schémas logiques SIGEP.

Reprend le prérequis du dossier de conception (§1-2 de la base de données) :
uuid-ossp, pgcrypto, postgis, pg_trgm, unaccent, btree_gin, citext, puis les
8 schémas ref/org/usr/ped/ges/trv/aud/sta.
"""
from django.db import migrations

EXTENSIONS = [
    "uuid-ossp",
    "pgcrypto",
    "postgis",
    "pg_trgm",
    "unaccent",
    "btree_gin",
    "citext",
]

SCHEMAS = ["ref", "org", "usr", "ped", "ges", "trv", "aud", "sta"]


def _create_extensions_sql():
    return "\n".join(f'CREATE EXTENSION IF NOT EXISTS "{ext}";' for ext in EXTENSIONS)


def _create_schemas_sql():
    return "\n".join(f"CREATE SCHEMA IF NOT EXISTS {schema};" for schema in SCHEMAS)


def _drop_schemas_sql():
    return "\n".join(f"DROP SCHEMA IF EXISTS {schema} CASCADE;" for schema in SCHEMAS)


class Migration(migrations.Migration):

    initial = True
    dependencies = []
    # Toute app dont les tables vivent dans un des schémas ci-dessus doit
    # attendre que ces schémas existent. Sans ce run_before, Django est
    # libre de choisir un ordre où (par ex.) usr.0001_initial s'exécute
    # avant core.0001_initial, et le CREATE TABLE "usr"."utilisateur" échoue
    # avec "schema usr does not exist".
    run_before = [
        ("ref", "0001_initial"),
        ("usr", "0001_initial"),
    ]

    operations = [
        migrations.RunSQL(
            sql=_create_extensions_sql(),
            reverse_sql=migrations.RunSQL.noop,
        ),
        migrations.RunSQL(
            sql=_create_schemas_sql(),
            reverse_sql=_drop_schemas_sql(),
        ),
    ]
