from rest_framework.routers import DefaultRouter

from .views import AffectationResponsableViewSet

router = DefaultRouter()
router.register("affectations", AffectationResponsableViewSet, basename="affectation")

urlpatterns = router.urls
