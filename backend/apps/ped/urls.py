from rest_framework.routers import DefaultRouter

from .views import EleveViewSet, FiliationViewSet

router = DefaultRouter()
router.register("eleves", EleveViewSet, basename="eleve")
router.register("filiations", FiliationViewSet, basename="filiation")

urlpatterns = router.urls
