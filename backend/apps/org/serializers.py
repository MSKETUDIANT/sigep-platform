from rest_framework import serializers

from apps.ref.models import Commune, Prefecture, Region, SousPrefecture

from .models import AffectationResponsable


class AffectationResponsableSerializer(serializers.ModelSerializer):
    utilisateur_nom = serializers.CharField(source="utilisateur.nom_complet", read_only=True)
    profil_display = serializers.CharField(source="get_profil_display", read_only=True)

    class Meta:
        model = AffectationResponsable
        fields = [
            "id", "utilisateur", "utilisateur_nom", "profil", "profil_display",
            "sous_prefecture", "commune", "prefecture", "region", "ecole_id",
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
    ecole_id = serializers.UUIDField(required=False, allow_null=True)
    motif = serializers.CharField(required=False, allow_blank=True, default="")
