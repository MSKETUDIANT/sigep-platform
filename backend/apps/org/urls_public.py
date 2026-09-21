"""Routes du portail citoyen (EPIC 5) — aucune authentification requise."""
from rest_framework.routers import DefaultRouter

from .views import EcolePubliqueViewSet

router = DefaultRouter()
router.register("ecoles", EcolePubliqueViewSet, basename="ecole-publique")

urlpatterns = router.urls
