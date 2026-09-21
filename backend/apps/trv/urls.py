from rest_framework.routers import DefaultRouter

from .views import EquipementViewSet

router = DefaultRouter()
router.register("equipements", EquipementViewSet, basename="equipement")

urlpatterns = router.urls
