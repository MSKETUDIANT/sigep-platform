from rest_framework import generics, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView

from apps.aud.services import consigner
from apps.core.permissions import EstSuperAdmin, LectureAuthentifieEcritureSuperAdmin
from apps.org.services import PROFILS_VUE_NATIONALE, ecoles_visibles

from .models import Enseignant, InterventionEnseignant, StatutCompte, Utilisateur
from .serializers import (
    ConnexionAvecOtpSerializer,
    ConnexionSerializer,
    DemandeOtpSerializer,
    EnseignantSerializer,
    InterventionEnseignantSerializer,
    UtilisateurCreateSerializer,
    UtilisateurSerializer,
    VerifierOtpSerializer,
)
from .utils import envoyer_otp, generer_mot_de_passe_provisoire


class ConnexionView(TokenObtainPairView):
    """US-2.1 : POST identifiant + password -> tokens JWT + profil (pour la
    redirection frontend vers l'espace correspondant). US-2.10 : pour les
    profils sensibles, renvoie code="otp_requis" au lieu d'un token — la
    deuxième étape passe par ConnexionAvecOtpView."""

    serializer_class = ConnexionSerializer
    permission_classes = [permissions.AllowAny]


class ConnexionAvecOtpView(TokenObtainPairView):
    """US-2.10 : deuxième étape de la double authentification (profils
    sensibles) — identifiant + mot de passe + code reçu par email -> tokens."""

    serializer_class = ConnexionAvecOtpSerializer
    permission_classes = [permissions.AllowAny]


class DemanderOtpView(generics.GenericAPIView):
    """Envoie un code par email — active un compte en attente d'activation,
    ou déclenche une réinitialisation libre-service du mot de passe pour un
    compte déjà actif. Self-service : remplace le besoin systématique du
    bouton "Activer" du Super Admin quand le compte a un email valide."""

    serializer_class = DemandeOtpSerializer
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        envoyer_otp(serializer.utilisateur)
        # L'identifiant réel est renvoyé (saisie possible par email) pour que
        # le frontend l'utilise à l'étape suivante sans que la personne ait
        # à le connaître elle-même.
        return Response({"detail": "Code envoyé par email.", "identifiant": serializer.utilisateur.identifiant})


class VerifierOtpView(generics.GenericAPIView):
    """Vérifie le code reçu par email : active le compte s'il était en
    attente, et/ou met à jour le mot de passe si nouveau_mot_de_passe est
    fourni (c'est toujours le cas depuis le frontend — l'utilisateur choisit
    lui-même son mot de passe, jamais transmis par un tiers, cf. US-2.2/2.7
    qui restaient muets sur ce point)."""

    serializer_class = VerifierOtpSerializer
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        utilisateur = serializer.utilisateur
        etait_en_attente = utilisateur.statut == StatutCompte.EN_ATTENTE_ACTIVATION

        champs = ["otp_secret", "otp_expire_le", "otp_actif"]
        utilisateur.otp_secret = None
        utilisateur.otp_expire_le = None
        utilisateur.otp_actif = True
        if etait_en_attente:
            utilisateur.statut = StatutCompte.ACTIF
            utilisateur.is_active = True
            champs += ["statut", "is_active"]

        nouveau_mdp = serializer.validated_data.get("nouveau_mot_de_passe")
        if nouveau_mdp:
            utilisateur.set_password(nouveau_mdp)
            utilisateur.mot_de_passe_provisoire = False
            champs += ["password", "mot_de_passe_provisoire"]

        utilisateur.save(update_fields=champs)
        consigner(
            acteur=utilisateur,
            action="activation_compte_otp" if etait_en_attente else "reinitialisation_mot_de_passe_otp",
            cible_type="usr.Utilisateur",
            cible_id=utilisateur.id,
            detail=(
                f"Compte {utilisateur.identifiant} activé par OTP email"
                if etait_en_attente
                else f"Mot de passe réinitialisé par OTP email pour {utilisateur.identifiant}"
            ),
        )
        message = "Compte activé" if etait_en_attente else "Mot de passe mis à jour"
        return Response({"detail": f"{message} — vous pouvez vous connecter."})


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
    def activer(self, request, pk=None):
        """Active un compte en attente d'activation ou suspendu — sans cette
        action, un compte créé (US-2.2, statut par défaut = en_attente_activation)
        ne pouvait jamais se connecter, faute de trigger OTP en place (SMS
        provider pas encore choisi, cf. décisions Sprint 2)."""
        utilisateur = self.get_object()
        utilisateur.statut = StatutCompte.ACTIF
        utilisateur.is_active = True
        utilisateur.save(update_fields=["statut", "is_active"])
        consigner(
            acteur=request.user,
            action="activation_compte",
            cible_type="usr.Utilisateur",
            cible_id=utilisateur.id,
            detail=f"Compte {utilisateur.identifiant} activé",
        )
        return Response(UtilisateurSerializer(utilisateur).data)

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
    """US-4.1 (création) et US-4.5 (liste bornée au périmètre — un enseignant
    est visible s'il intervient dans au moins une école du périmètre du
    profil connecté). Écriture réservée au Super Admin pour l'instant (même
    logique que org.Ecole) — ouverture au Directeur d'École à affiner plus tard."""

    permission_classes = [LectureAuthentifieEcritureSuperAdmin]
    filterset_fields = ["statut_enseignant"]
    search_fields = ["matricule", "utilisateur__nom", "utilisateur__prenoms", "matiere_principale"]

    def get_serializer_class(self):
        return EnseignantSerializer

    def get_queryset(self):
        user = self.request.user
        qs = Enseignant.objects.select_related("utilisateur")
        if user.profil in PROFILS_VUE_NATIONALE:
            return qs
        return qs.filter(interventions__ecole__in=ecoles_visibles(user)).distinct()

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
    """US-4.1/US-4.2/US-4.6 : rattachement d'un enseignant à une école/classe,
    borné au périmètre (US-4.5) — sert aussi d'"emploi du temps" en filtrant
    par ?enseignant=<son_id> (US-4.6)."""

    serializer_class = InterventionEnseignantSerializer
    permission_classes = [LectureAuthentifieEcritureSuperAdmin]
    filterset_fields = ["enseignant", "ecole", "classe", "actif", "annee_academique"]

    def get_queryset(self):
        qs = InterventionEnseignant.objects.select_related("enseignant__utilisateur", "ecole", "classe")
        user = self.request.user
        if user.profil in PROFILS_VUE_NATIONALE:
            return qs
        if user.profil == "enseignant":
            # US-4.6 : un enseignant voit toujours ses propres interventions,
            # même si aucune règle de périmètre territorial ne s'applique à lui.
            return qs.filter(enseignant__utilisateur=user)
        return qs.filter(ecole__in=ecoles_visibles(user))
