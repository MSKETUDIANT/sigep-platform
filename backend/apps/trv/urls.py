from rest_framework.routers import DefaultRouter

from .views import EquipementViewSet, InspectionViewSet, SignalementViewSet

router = DefaultRouter()
router.register("equipements", EquipementViewSet, basename="equipement")
router.register("signalements", SignalementViewSet, basename="signalement")
router.register("inspections", InspectionViewSet, basename="inspection")

urlpatterns = router.urls
