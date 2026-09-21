from django.urls import path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    ConnexionView,
    EnseignantViewSet,
    InterventionEnseignantViewSet,
    MoiView,
    UtilisateurViewSet,
)

router = DefaultRouter()
router.register("utilisateurs", UtilisateurViewSet, basename="utilisateur")
router.register("enseignants", EnseignantViewSet, basename="enseignant")
router.register("interventions-enseignants", InterventionEnseignantViewSet, basename="intervention-enseignant")

urlpatterns = [
    path("connexion/", ConnexionView.as_view(), name="connexion"),
    path("rafraichir/", TokenRefreshView.as_view(), name="token-refresh"),
    path("moi/", MoiView.as_view(), name="moi"),
] + router.urls
