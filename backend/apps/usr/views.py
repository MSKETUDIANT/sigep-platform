from rest_framework import generics, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView

from apps.aud.services import consigner
from apps.core.permissions import EstSuperAdmin, LectureAuthentifieEcritureSuperAdmin

from .models import Enseignant, InterventionEnseignant, StatutCompte, Utilisateur
from .serializers import (
    ConnexionSerializer,
    EnseignantSerializer,
    InterventionEnseignantSerializer,
    UtilisateurCreateSerializer,
    UtilisateurSerializer,
)
from .utils import generer_mot_de_passe_provisoire


class ConnexionView(TokenObtainPairView):
    """US-2.1 : POST identifiant + password -> tokens JWT + profil (pour la
    redirection frontend vers l'espace correspondant)."""

    serializer_class = ConnexionSerializer
    permission_classes = [permissions.AllowAny]


class MoiView(generics.RetrieveAPIView):
    """Utilisateur courant, utilisé par le frontend juste après connexion."""

    serializer_class = UtilisateurSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user


class UtilisateurViewSet(viewsets.ModelViewSet):
    """US-2.2 (création), US-2.5 (révocation), US-2.7 (réinitialisation de
    mot de passe) — réservé au Super Admin (§2.3 : "seul profil habilité")."""

    queryset = Utilisateur.objects.all().order_by("nom", "prenoms")
    permission_classes = [EstSuperAdmin]
    filterset_fields = ["profil", "statut", "is_active"]
    search_fields = ["identifiant", "nom", "prenoms", "email", "telephone"]

    def get_serializer_class(self):
        if self.action == "create":
            return UtilisateurCreateSerializer
        return UtilisateurSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        utilisateur = serializer.save()
        consigner(
            acteur=request.user,
            action="creation_compte",
            cible_type="usr.Utilisateur",
            cible_id=utilisateur.id,
            detail=f"Compte {utilisateur.identifiant} ({utilisateur.profil}) créé",
        )
        reponse = UtilisateurSerializer(utilisateur).data
        reponse["mot_de_passe_provisoire_genere"] = utilisateur.mot_de_passe_genere
        return Response(reponse, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"])
    def revoquer(self, request, pk=None):
        """US-2.5 : révocation, accès immédiatement bloqué (is_active=False)."""
        utilisateur = self.get_object()
        utilisateur.statut = StatutCompte.REVOQUE
        utilisateur.is_active = False
        utilisateur.save(update_fields=["statut", "is_active"])
        consigner(
            acteur=request.user,
            action="revocation_compte",
            cible_type="usr.Utilisateur",
            cible_id=utilisateur.id,
            detail=f"Compte {utilisateur.identifiant} révoqué",
        )
        return Response(UtilisateurSerializer(utilisateur).data)

    @action(detail=True, methods=["post"])
    def reinitialiser_mot_de_passe(self, request, pk=None):
        """US-2.7 : réinitialisation — nouveau mot de passe provisoire généré,
        retourné une seule fois dans la réponse."""
        utilisateur = self.get_object()
        nouveau = generer_mot_de_passe_provisoire()
        utilisateur.set_password(nouveau)
        utilisateur.mot_de_passe_provisoire = True
        utilisateur.save(update_fields=["password", "mot_de_passe_provisoire"])
        consigner(
            acteur=request.user,
            action="reinitialisation_mot_de_passe",
            cible_type="usr.Utilisateur",
            cible_id=utilisateur.id,
            detail=f"Mot de passe réinitialisé pour {utilisateur.identifiant}",
        )
        return Response({"mot_de_passe_provisoire_genere": nouveau})


class EnseignantViewSet(viewsets.ModelViewSet):
    """US-4.1. Écriture réservée au Super Admin pour l'instant (même logique
    que org.Ecole) — ouverture au Directeur d'École à affiner plus tard."""

    queryset = Enseignant.objects.select_related("utilisateur").all()
    permission_classes = [LectureAuthentifieEcritureSuperAdmin]
    filterset_fields = ["statut_enseignant"]
    search_fields = ["matricule", "utilisateur__nom", "utilisateur__prenoms", "matiere_principale"]

    def get_serializer_class(self):
        return EnseignantSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        enseignant = serializer.save()
        consigner(
            acteur=request.user,
            action="creation_enseignant",
            cible_type="usr.Enseignant",
            cible_id=enseignant.id,
            detail=f"{enseignant.matricule} — {enseignant.utilisateur.nom_complet}",
        )
        reponse = EnseignantSerializer(enseignant).data
        reponse["mot_de_passe_provisoire_genere"] = enseignant.mot_de_passe_genere
        return Response(reponse, status=status.HTTP_201_CREATED)


class InterventionEnseignantViewSet(viewsets.ModelViewSet):
    """US-4.1/US-4.2 : rattachement d'un enseignant à une école/classe."""

    queryset = InterventionEnseignant.objects.select_related(
        "enseignant__utilisateur", "ecole", "classe"
    ).all()
    serializer_class = InterventionEnseignantSerializer
    permission_classes = [LectureAuthentifieEcritureSuperAdmin]
    filterset_fields = ["enseignant", "ecole", "classe", "actif", "annee_academique"]
