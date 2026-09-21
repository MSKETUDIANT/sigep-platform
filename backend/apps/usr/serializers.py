from rest_framework import serializers
from rest_framework_simplejwt.exceptions import AuthenticationFailed as JWTAuthenticationFailed
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import StatutCompte, Utilisateur
from .utils import generer_mot_de_passe_provisoire


class ConnexionSerializer(TokenObtainPairSerializer):
    """US-2.1 : connexion par identifiant/mot de passe, refusée si le compte
    n'est pas actif (US-2.5 : un compte révoqué/suspendu ne peut plus se
    connecter)."""

    MESSAGES_STATUT = {
        StatutCompte.EN_ATTENTE_ACTIVATION: "Ce compte est en attente d'activation.",
        StatutCompte.SUSPENDU: "Ce compte est suspendu.",
        StatutCompte.REVOQUE: "Ce compte a été révoqué.",
    }

    def validate(self, attrs):
        data = super().validate(attrs)
        if self.user.statut != StatutCompte.ACTIF:
            raise JWTAuthenticationFailed(
                self.MESSAGES_STATUT.get(self.user.statut, "Ce compte n'est pas actif."),
                code="compte_inactif",
            )
        data["profil"] = self.user.profil
        data["identifiant"] = self.user.identifiant
        data["nom_complet"] = self.user.nom_complet
        data["mot_de_passe_provisoire"] = self.user.mot_de_passe_provisoire
        return data


class UtilisateurSerializer(serializers.ModelSerializer):
    """Lecture (US-2.1 "/moi/", listing du Super Admin)."""

    profil_display = serializers.CharField(source="get_profil_display", read_only=True)
    statut_display = serializers.CharField(source="get_statut_display", read_only=True)
    affectation_active = serializers.SerializerMethodField()

    class Meta:
        model = Utilisateur
        fields = [
            "id", "identifiant", "email", "telephone", "profil", "profil_display",
            "statut", "statut_display", "nom", "prenoms", "date_naissance", "sexe",
            "photo_url", "mot_de_passe_provisoire", "otp_actif", "is_active",
            "affectation_active", "cree_le", "modifie_le",
        ]
        read_only_fields = [
            "id", "statut", "mot_de_passe_provisoire", "is_active", "cree_le", "modifie_le",
        ]

    def get_affectation_active(self, obj):
        affectation = (
            obj.affectations.filter(statut="actif", date_fin__isnull=True)
            .select_related("sous_prefecture", "commune", "prefecture", "region")
            .first()
        )
        if not affectation:
            return None
        return {
            "id": str(affectation.id),
            "sous_prefecture": affectation.sous_prefecture.nom if affectation.sous_prefecture else None,
            "commune": affectation.commune.nom if affectation.commune else None,
            "prefecture": affectation.prefecture.nom if affectation.prefecture else None,
            "region": affectation.region.nom if affectation.region else None,
            "ecole_id": str(affectation.ecole_id) if affectation.ecole_id else None,
            "date_debut": affectation.date_debut,
        }


class UtilisateurCreateSerializer(serializers.ModelSerializer):
    """US-2.2 : création d'un compte par le Super Admin — mot de passe
    provisoire généré automatiquement, jamais saisi par le créateur."""

    class Meta:
        model = Utilisateur
        fields = ["identifiant", "email", "telephone", "profil", "nom", "prenoms", "date_naissance", "sexe"]

    def create(self, validated_data):
        mot_de_passe = generer_mot_de_passe_provisoire()
        utilisateur = Utilisateur.objects.create_user(
            identifiant=validated_data.pop("identifiant"),
            telephone=validated_data.pop("telephone"),
            profil=validated_data.pop("profil"),
            password=mot_de_passe,
            **validated_data,
        )
        utilisateur.statut = StatutCompte.EN_ATTENTE_ACTIVATION
        utilisateur.mot_de_passe_provisoire = True
        utilisateur.save(update_fields=["statut", "mot_de_passe_provisoire"])
        # Exposé une seule fois par la vue (creation response) — jamais stocké en clair.
        utilisateur.mot_de_passe_genere = mot_de_passe
        return utilisateur
