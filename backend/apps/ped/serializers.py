from rest_framework import serializers

from . import services
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
    # §7.1 : barème 1re-6e (Primaire) = /10, 7e-Terminale (Collège/Lycée) = /20 —
    # exposé pour que le frontend affiche/valide le bon barème sans dupliquer
    # la règle (voir aussi InterventionEnseignantSerializer.cycle_code).
    cycle_code = serializers.CharField(source="classe.cycle.code", read_only=True)
    statut_display = serializers.CharField(source="get_statut_display", read_only=True)
    sexe_display = serializers.CharField(source="get_sexe_display", read_only=True)
    filiations = FiliationSerializer(many=True, read_only=True)
    # US-9.2 : "photo" reçoit le fichier envoyé (multipart), "photo_url" est
    # l'URL absolue à afficher — jamais l'inverse, une URL ne se "colle" plus.
    photo_url = serializers.SerializerMethodField()

    class Meta:
        model = Eleve
        fields = [
            "id", "matricule", "nom", "prenoms", "sexe", "sexe_display",
            "date_naissance", "lieu_naissance", "photo", "photo_url",
            "ecole", "ecole_nom", "classe", "classe_libelle", "cycle_code", "annee_academique",
            "statut", "statut_display", "filiations", "cree_le", "modifie_le",
        ]
        read_only_fields = ["id", "matricule", "cree_le", "modifie_le"]
        extra_kwargs = {"photo": {"write_only": True, "required": False}}

    def get_photo_url(self, obj):
        if not obj.photo:
            return None
        request = self.context.get("request")
        return request.build_absolute_uri(obj.photo.url) if request else obj.photo.url


class NoteSerializer(serializers.ModelSerializer):
    eleve_nom = serializers.CharField(source="eleve.nom_complet", read_only=True)
    trimestre_display = serializers.CharField(source="get_trimestre_display", read_only=True)
    saisi_par_nom = serializers.CharField(source="saisi_par.nom_complet", read_only=True, default=None)
    bareme = serializers.SerializerMethodField()

    class Meta:
        model = Note
        fields = [
            "id", "eleve", "eleve_nom", "matiere", "trimestre", "trimestre_display",
            "type_evaluation", "valeur", "bareme", "verrouille", "annee_academique",
            "saisi_par", "saisi_par_nom", "cree_le", "modifie_le",
        ]
        read_only_fields = ["id", "verrouille", "saisi_par", "cree_le", "modifie_le"]

    def get_bareme(self, obj):
        return services.bareme(obj.eleve)

    def validate(self, attrs):
        eleve = attrs.get("eleve", getattr(self.instance, "eleve", None))
        valeur = attrs.get("valeur", getattr(self.instance, "valeur", None))
        if eleve is not None and valeur is not None:
            max_note = services.bareme(eleve)
            if valeur < 0 or valeur > max_note:
                raise serializers.ValidationError(
                    {"valeur": f"La note doit être comprise entre 0 et {max_note} pour cet élève."}
                )
        return attrs


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
