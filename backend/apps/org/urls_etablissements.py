"""Routes distinctes de org/urls.py (affectations, sous /api/comptes/) : les
écoles ne sont pas des « comptes », elles vivent sous /api/etablissements/."""
from rest_framework.routers import DefaultRouter

from .views import EcoleViewSet

router = DefaultRouter()
router.register("ecoles", EcoleViewSet, basename="ecole")

urlpatterns = router.urls
