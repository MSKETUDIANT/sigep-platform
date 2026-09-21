from rest_framework import serializers

from apps.ref.models import Commune, Prefecture, Region, SousPrefecture

from .models import AffectationResponsable, Ecole


class AffectationResponsableSerializer(serializers.ModelSerializer):
    utilisateur_nom = serializers.CharField(source="utilisateur.nom_complet", read_only=True)
    profil_display = serializers.CharField(source="get_profil_display", read_only=True)

    class Meta:
        model = AffectationResponsable
        fields = [
            "id", "utilisateur", "utilisateur_nom", "profil", "profil_display",
            "sous_prefecture", "commune", "prefecture", "region", "ecole",
            "date_debut", "date_fin", "statut", "affecte_par", "motif",
            "cree_le", "modifie_le",
        ]
        read_only_fields = ["id", "affecte_par", "statut", "date_fin", "cree_le", "modifie_le"]


class ReaffectationSerializer(serializers.Serializer):
    """US-2.4 : ne porte que le NOUVEAU périmètre — utilisateur/profil sont
    repris de l'affectation existante, jamais fournis par le client."""

    sous_prefecture = serializers.PrimaryKeyRelatedField(
        queryset=SousPrefecture.objects.all(), required=False, allow_null=True
    )
    commune = serializers.PrimaryKeyRelatedField(queryset=Commune.objects.all(), required=False, allow_null=True)
    prefecture = serializers.PrimaryKeyRelatedField(
        queryset=Prefecture.objects.all(), required=False, allow_null=True
    )
    region = serializers.PrimaryKeyRelatedField(queryset=Region.objects.all(), required=False, allow_null=True)
    ecole = serializers.PrimaryKeyRelatedField(queryset=Ecole.objects.all(), required=False, allow_null=True)
    motif = serializers.CharField(required=False, allow_blank=True, default="")


class EcoleSerializer(serializers.ModelSerializer):
    sous_prefecture_nom = serializers.CharField(source="sous_prefecture.nom", read_only=True, default=None)
    prefecture_nom = serializers.CharField(source="prefecture.nom", read_only=True, default=None)
    commune_nom = serializers.CharField(source="commune.nom", read_only=True, default=None)
    quartier_nom = serializers.CharField(source="quartier.nom", read_only=True, default=None)
    region_nom = serializers.CharField(source="region.nom", read_only=True, default=None)
    type_ecole_display = serializers.CharField(source="get_type_ecole_display", read_only=True)
    langue_enseignement_display = serializers.CharField(source="get_langue_enseignement_display", read_only=True)
    etat_general_display = serializers.CharField(source="get_etat_general_display", read_only=True)
    directeur_nom = serializers.CharField(source="directeur.nom_complet", read_only=True, default=None)

    class Meta:
        model = Ecole
        fields = [
            "id", "code_ecole", "nom", "schema_identification",
            "sous_prefecture", "sous_prefecture_nom", "prefecture", "prefecture_nom",
            "commune", "commune_nom", "quartier", "quartier_nom", "region", "region_nom",
            "type_ecole", "type_ecole_display", "langue_enseignement", "langue_enseignement_display",
            "annee_creation", "adresse",
            "capacite_eleves", "nombre_salles", "nombre_salles_fonctionnelles",
            "nombre_enseignants", "nombre_eleves", "nombre_eleves_filles", "nombre_eleves_garcons",
            "etat_general", "etat_general_display", "score", "statut_ouverture",
            "directeur", "directeur_nom",
            "actif", "cree_le", "modifie_le",
        ]
        read_only_fields = [
            "id", "code_ecole", "prefecture", "commune", "region", "cree_le", "modifie_le",
        ]

    def validate(self, attrs):
        schema = attrs.get("schema_identification", getattr(self.instance, "schema_identification", None))
        sous_prefecture = attrs.get("sous_prefecture", getattr(self.instance, "sous_prefecture", None))
        quartier = attrs.get("quartier", getattr(self.instance, "quartier", None))
        if schema == "A" and not sous_prefecture:
            raise serializers.ValidationError("Le schéma A requiert une sous-préfecture.")
        if schema == "B" and not quartier:
            raise serializers.ValidationError("Le schéma B requiert un quartier.")
        return attrs
