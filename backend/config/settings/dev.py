from .base import *  # noqa: F401,F403

DEBUG = True
ALLOWED_HOSTS = ["*"]

# GeoDjango sur Windows (hors Docker) : décommentez et adaptez ces chemins si
# GDAL/GEOS ne sont pas auto-détectés (voir docs/architecture.md).
# GDAL_LIBRARY_PATH = r"C:\OSGeo4W\bin\gdal310.dll"
# GEOS_LIBRARY_PATH = r"C:\OSGeo4W\bin\geos_c.dll"
