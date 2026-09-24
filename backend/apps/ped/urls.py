from rest_framework.routers import DefaultRouter

from .views import (
    DeliberationViewSet,
    EleveViewSet,
    FiliationViewSet,
    InscriptionExamenViewSet,
    NoteViewSet,
    PresenceViewSet,
)

router = DefaultRouter()
router.register("eleves", EleveViewSet, basename="eleve")
router.register("filiations", FiliationViewSet, basename="filiation")
router.register("notes", NoteViewSet, basename="note")
router.register("presences", PresenceViewSet, basename="presence")
router.register("inscriptions-examens", InscriptionExamenViewSet, basename="inscription-examen")
router.register("deliberations", DeliberationViewSet, basename="deliberation")

urlpatterns = router.urls
