from rest_framework import serializers

from .models import Deliberation, Eleve, Filiation, InscriptionExamen, Note, Presence


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


class NoteSerializer(serializers.ModelSerializer):
    eleve_nom = serializers.CharField(source="eleve.nom_complet", read_only=True)
    trimestre_display = serializers.CharField(source="get_trimestre_display", read_only=True)
    saisi_par_nom = serializers.CharField(source="saisi_par.nom_complet", read_only=True, default=None)

    class Meta:
        model = Note
        fields = [
            "id", "eleve", "eleve_nom", "matiere", "trimestre", "trimestre_display",
            "type_evaluation", "valeur", "verrouille", "annee_academique",
            "saisi_par", "saisi_par_nom", "cree_le", "modifie_le",
        ]
        read_only_fields = ["id", "verrouille", "saisi_par", "cree_le", "modifie_le"]

    def validate_valeur(self, valeur):
        if valeur < 0 or valeur > 20:
            raise serializers.ValidationError("La note doit être comprise entre 0 et 20.")
        return valeur


class PresenceSerializer(serializers.ModelSerializer):
    eleve_nom = serializers.CharField(source="eleve.nom_complet", read_only=True)
    classe_libelle = serializers.CharField(source="classe.libelle", read_only=True)

    class Meta:
        model = Presence
        fields = [
            "id", "eleve", "eleve_nom", "classe", "classe_libelle", "matiere",
            "date", "present", "enregistre_par", "cree_le",
        ]
        read_only_fields = ["id", "enregistre_par", "cree_le"]


class InscriptionExamenSerializer(serializers.ModelSerializer):
    eleve_nom = serializers.CharField(source="eleve.nom_complet", read_only=True)
    resultat_display = serializers.CharField(source="get_resultat_display", read_only=True)

    class Meta:
        model = InscriptionExamen
        fields = [
            "id", "eleve", "eleve_nom", "type_examen", "annee_academique", "numero_candidat",
            "resultat", "resultat_display", "moyenne_examen", "date_resultat", "cree_le",
        ]
        read_only_fields = ["id", "numero_candidat", "cree_le"]


class DeliberationSerializer(serializers.ModelSerializer):
    eleve_nom = serializers.CharField(source="eleve.nom_complet", read_only=True)
    statut_display = serializers.CharField(source="get_statut_display", read_only=True)
    decide_par_nom = serializers.CharField(source="decide_par.nom_complet", read_only=True, default=None)

    class Meta:
        model = Deliberation
        fields = [
            "id", "eleve", "eleve_nom", "annee_academique", "moyenne_generale",
            "statut", "statut_display", "motif", "decide_par", "decide_par_nom", "date_deliberation",
        ]
        read_only_fields = ["id", "decide_par", "date_deliberation"]
