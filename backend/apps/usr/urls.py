from django.urls import path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    ConnexionView,
    DemanderOtpView,
    EnseignantViewSet,
    InterventionEnseignantViewSet,
    MoiView,
    UtilisateurViewSet,
    VerifierOtpView,
)

router = DefaultRouter()
router.register("utilisateurs", UtilisateurViewSet, basename="utilisateur")
router.register("enseignants", EnseignantViewSet, basename="enseignant")
router.register("interventions-enseignants", InterventionEnseignantViewSet, basename="intervention-enseignant")

urlpatterns = [
    path("connexion/", ConnexionView.as_view(), name="connexion"),
    path("rafraichir/", TokenRefreshView.as_view(), name="token-refresh"),
    path("moi/", MoiView.as_view(), name="moi"),
    path("otp/envoyer/", DemanderOtpView.as_view(), name="otp-envoyer"),
    path("otp/verifier/", VerifierOtpView.as_view(), name="otp-verifier"),
] + router.urls
