from rest_framework.routers import DefaultRouter

from .views import (
    CommuneViewSet,
    PrefectureViewSet,
    QuartierViewSet,
    RegionViewSet,
    SousPrefectureViewSet,
)

router = DefaultRouter()
router.register("regions", RegionViewSet, basename="region")
router.register("prefectures", PrefectureViewSet, basename="prefecture")
router.register("sous-prefectures", SousPrefectureViewSet, basename="sous-prefecture")
router.register("communes", CommuneViewSet, basename="commune")
router.register("quartiers", QuartierViewSet, basename="quartier")

urlpatterns = router.urls
