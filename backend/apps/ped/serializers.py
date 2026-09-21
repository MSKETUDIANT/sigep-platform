from rest_framework import serializers

from .models import Eleve, Filiation


class FiliationSerializer(serializers.ModelSerializer):
    lien_display = serializers.CharField(source="get_lien_display", read_only=True)

    class Meta:
        model = Filiation
        fields = ["id", "eleve", "lien", "lien_display", "nom_complet", "telephone", "urgence", "cree_le"]
        read_only_fields = ["id", "cree_le"]


class EleveSerializer(serializers.ModelSerializer):
    ecole_nom = serializers.CharField(source="ecole.nom", read_only=True)
    classe_libelle = serializers.CharField(source="classe.libelle", read_only=True)
    statut_display = serializers.CharField(source="get_statut_display", read_only=True)
    sexe_display = serializers.CharField(source="get_sexe_display", read_only=True)
    filiations = FiliationSerializer(many=True, read_only=True)

    class Meta:
        model = Eleve
        fields = [
            "id", "matricule", "nom", "prenoms", "sexe", "sexe_display",
            "date_naissance", "lieu_naissance", "photo_url",
            "ecole", "ecole_nom", "classe", "classe_libelle", "annee_academique",
            "statut", "statut_display", "filiations", "cree_le", "modifie_le",
        ]
        read_only_fields = ["id", "matricule", "cree_le", "modifie_le"]
