from django.utils import timezone
from rest_framework import serializers
from rest_framework_simplejwt.exceptions import AuthenticationFailed as JWTAuthenticationFailed
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import Enseignant, InterventionEnseignant, StatutCompte, Utilisateur
from .utils import envoyer_email_bienvenue, envoyer_otp, generer_mot_de_passe_provisoire

# US-2.10 (texte réel du backlog) : "OTP requis pour Directeur, DSE, DCE, DPE,
# IR et Super Admin à la connexion" — une double authentification à CHAQUE
# connexion pour ces profils sensibles, pas juste une activation ponctuelle du
# compte (ça, c'est un mécanisme distinct, construit avant qu'on ne retrouve
# ce texte — voir DemandeOtpSerializer/VerifierOtpSerializer plus bas).
PROFILS_DOUBLE_AUTH = {"directeur_ecole", "dse", "dce", "dpe", "ir", "super_admin"}


def resoudre_identifiant(valeur: str) -> str:
    """Une saisie ressemblant à un email et correspondant à un compte connu
    est remplacée par le véritable identifiant avant authentification — pour
    que la connexion accepte l'identifiant OU l'email, comme /activation."""
    if valeur and "@" in valeur:
        utilisateur = Utilisateur.objects.filter(email__iexact=valeur).first()
        if utilisateur:
            return utilisateur.identifiant
    return valeur


class ConnexionSerializer(TokenObtainPairSerializer):
    """US-2.1 : connexion par identifiant (ou email) + mot de passe, refusée
    si le compte n'est pas actif (US-2.5 : un compte révoqué/suspendu ne peut
    plus se connecter). US-2.10 : pour les profils sensibles, le mot de passe
    seul ne suffit pas — un code envoyé par email doit être vérifié via
    ConnexionAvecOtpSerializer avant d'obtenir un token."""

    MESSAGES_STATUT = {
        StatutCompte.EN_ATTENTE_ACTIVATION: "Ce compte est en attente d'activation.",
        StatutCompte.SUSPENDU: "Ce compte est suspendu.",
        StatutCompte.REVOQUE: "Ce compte a été révoqué.",
    }

    def validate(self, attrs):
        attrs[self.username_field] = resoudre_identifiant(attrs.get(self.username_field, ""))
        data = super().validate(attrs)
        if self.user.statut != StatutCompte.ACTIF:
            # Le "code" distingue en_attente_activation (auto-activable par OTP
            # email, US-2.10) de suspendu/révoqué (action Super Admin requise).
            # simplejwt.DetailDictMixin construit {"detail":..., "code":...} à
            # partir des deux arguments positionnels — le second (code=) prend
            # le dessus sur toute clé "code" fournie dans le detail, donc c'est
            # bien lui qu'il faut renseigner ici, pas un dict.
            raise JWTAuthenticationFailed(
                self.MESSAGES_STATUT.get(self.user.statut, "Ce compte n'est pas actif."),
                code=f"statut_{self.user.statut}",
            )
        if self.user.profil in PROFILS_DOUBLE_AUTH:
            envoyer_otp(self.user)
            raise JWTAuthenticationFailed(
                "Un code de vérification a été envoyé par email.",
                code="otp_requis",
            )
        data["profil"] = self.user.profil
        data["identifiant"] = self.user.identifiant
        data["nom_complet"] = self.user.nom_complet
        data["mot_de_passe_provisoire"] = self.user.mot_de_passe_provisoire
        return data


class ConnexionAvecOtpSerializer(TokenObtainPairSerializer):
    """US-2.10 : deuxième étape de la double authentification — identifiant +
    mot de passe (revérifiés) + code reçu par email."""

    code = serializers.CharField(write_only=True, max_length=6, min_length=6)

    def validate(self, attrs):
        code = attrs.pop("code")
        attrs[self.username_field] = resoudre_identifiant(attrs.get(self.username_field, ""))
        data = super().validate(attrs)

        if self.user.statut != StatutCompte.ACTIF:
            raise JWTAuthenticationFailed(
                ConnexionSerializer.MESSAGES_STATUT.get(self.user.statut, "Ce compte n'est pas actif."),
                code=f"statut_{self.user.statut}",
            )
        if not self.user.otp_secret or not self.user.otp_expire_le:
            raise serializers.ValidationError("Aucun code n'a été demandé — recommencez la connexion.")
        if timezone.now() > self.user.otp_expire_le:
            raise serializers.ValidationError("Ce code a expiré — recommencez la connexion.")
        if code != self.user.otp_secret:
            raise serializers.ValidationError("Code incorrect.")

        self.user.otp_secret = None
        self.user.otp_expire_le = None
        self.user.otp_actif = True
        self.user.save(update_fields=["otp_secret", "otp_expire_le", "otp_actif"])

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
    enseignant_id = serializers.SerializerMethodField()

    class Meta:
        model = Utilisateur
        fields = [
            "id", "identifiant", "email", "telephone", "profil", "profil_display",
            "statut", "statut_display", "nom", "prenoms", "date_naissance", "sexe",
            "photo_url", "mot_de_passe_provisoire", "otp_actif", "is_active",
            "affectation_active", "enseignant_id", "cree_le", "modifie_le",
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

    def get_enseignant_id(self, obj):
        fiche = getattr(obj, "fiche_enseignant", None)
        return str(fiche.id) if fiche else None


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
        envoyer_email_bienvenue(utilisateur)
        # Exposé une seule fois par la vue (creation response) — jamais stocké en clair.
        utilisateur.mot_de_passe_genere = mot_de_passe
        return utilisateur


class EnseignantSerializer(serializers.ModelSerializer):
    """US-4.1 : fiche enseignant. La création crée aussi le compte Utilisateur
    sous-jacent (mot de passe provisoire généré, comme US-2.2)."""

    nom = serializers.CharField(write_only=True, required=False)
    prenoms = serializers.CharField(write_only=True, required=False)
    telephone = serializers.CharField(write_only=True, required=False)
    identifiant = serializers.CharField(write_only=True, required=False)
    email = serializers.EmailField(write_only=True, required=False, allow_null=True)

    utilisateur_nom = serializers.CharField(source="utilisateur.nom_complet", read_only=True)
    identifiant_lecture = serializers.CharField(source="utilisateur.identifiant", read_only=True)
    statut_enseignant_display = serializers.CharField(source="get_statut_enseignant_display", read_only=True)

    class Meta:
        model = Enseignant
        fields = [
            "id", "utilisateur", "utilisateur_nom", "identifiant_lecture", "matricule",
            "matiere_principale", "statut_enseignant", "statut_enseignant_display",
            "cree_le", "modifie_le",
            "nom", "prenoms", "telephone", "identifiant", "email",
        ]
        read_only_fields = ["id", "utilisateur", "matricule", "cree_le", "modifie_le"]

    def create(self, validated_data):
        donnees_compte = {
            "identifiant": validated_data.pop("identifiant"),
            "telephone": validated_data.pop("telephone"),
            "nom": validated_data.pop("nom"),
            "prenoms": validated_data.pop("prenoms"),
            "email": validated_data.pop("email", None),
        }
        mot_de_passe = generer_mot_de_passe_provisoire()
        utilisateur = Utilisateur.objects.create_user(
            profil="enseignant", password=mot_de_passe, **donnees_compte
        )
        utilisateur.statut = StatutCompte.EN_ATTENTE_ACTIVATION
        utilisateur.mot_de_passe_provisoire = True
        utilisateur.save(update_fields=["statut", "mot_de_passe_provisoire"])
        envoyer_email_bienvenue(utilisateur)

        enseignant = Enseignant.objects.create(utilisateur=utilisateur, **validated_data)
        enseignant.mot_de_passe_genere = mot_de_passe
        return enseignant


class InterventionEnseignantSerializer(serializers.ModelSerializer):
    enseignant_nom = serializers.CharField(source="enseignant.utilisateur.nom_complet", read_only=True)
    ecole_nom = serializers.CharField(source="ecole.nom", read_only=True)
    classe_libelle = serializers.CharField(source="classe.libelle", read_only=True)

    class Meta:
        model = InterventionEnseignant
        fields = [
            "id", "enseignant", "enseignant_nom", "ecole", "ecole_nom", "classe", "classe_libelle",
            "matiere", "volume_horaire_hebdo", "annee_academique", "actif", "cree_le", "modifie_le",
        ]
        read_only_fields = ["id", "cree_le", "modifie_le"]


class DemandeOtpSerializer(serializers.Serializer):
    """Demande d'envoi d'un code par email — sert à la fois à activer un
    compte fraîchement créé (statut en_attente_activation) et à la
    réinitialisation libre-service d'un mot de passe (compte déjà actif).
    Un compte suspendu/révoqué ne peut pas contourner son blocage par ce
    biais — il faut repasser par le Super Admin.

    `identifiant` accepte en réalité l'identifiant OU l'email : une personne
    qui a oublié son mot de passe ne se souvient pas forcément de
    l'identifiant (généré depuis nom/prénoms, cf. suggererIdentifiant côté
    frontend) mais connaît son email."""

    identifiant = serializers.CharField()

    def validate_identifiant(self, valeur):
        valeur = valeur.strip()
        utilisateur = (
            Utilisateur.objects.filter(identifiant=valeur).first()
            or Utilisateur.objects.filter(email__iexact=valeur).first()
        )
        if not utilisateur:
            raise serializers.ValidationError("Aucun compte avec cet identifiant ou cet email.")
        if utilisateur.statut in (StatutCompte.SUSPENDU, StatutCompte.REVOQUE):
            raise serializers.ValidationError(
                "Ce compte est bloqué — contactez le Super Admin."
            )
        if not utilisateur.email:
            raise serializers.ValidationError(
                "Aucun email n'est associé à ce compte — contactez le Super Admin."
            )
        self.utilisateur = utilisateur
        return valeur


class VerifierOtpSerializer(serializers.Serializer):
    """Vérifie le code reçu par email. Si le compte était en attente
    d'activation, l'active. `nouveau_mot_de_passe` est optionnel côté API
    (le bouton "Activer" du Super Admin ne passe pas par ce endpoint), mais
    le frontend le rend obligatoire à chaque fois : l'utilisateur choisit
    toujours lui-même son mot de passe, jamais transmis par un tiers."""

    identifiant = serializers.CharField()
    code = serializers.CharField(max_length=6, min_length=6)
    nouveau_mot_de_passe = serializers.CharField(min_length=8, required=False, allow_blank=True, write_only=True)

    def validate(self, attrs):
        try:
            utilisateur = Utilisateur.objects.get(identifiant=attrs["identifiant"])
        except Utilisateur.DoesNotExist:
            raise serializers.ValidationError("Aucun compte avec cet identifiant.")

        if not utilisateur.otp_secret or not utilisateur.otp_expire_le:
            raise serializers.ValidationError("Aucun code n'a été demandé pour ce compte.")
        if timezone.now() > utilisateur.otp_expire_le:
            raise serializers.ValidationError("Ce code a expiré — demandez-en un nouveau.")
        if attrs["code"] != utilisateur.otp_secret:
            raise serializers.ValidationError("Code incorrect.")

        self.utilisateur = utilisateur
        return attrs
