from rest_framework import serializers

from .models import Equipement, Inspection, MessageContact, Signalement, StatutSignalement


class EquipementSerializer(serializers.ModelSerializer):
    ecole_nom = serializers.CharField(source="ecole.nom", read_only=True)
    hors_service = serializers.SerializerMethodField()

    class Meta:
        model = Equipement
        fields = [
            "id", "ecole", "ecole_nom", "type_equipement", "total", "fonctionnel", "a_reparer",
            "hors_service", "cree_le", "modifie_le",
        ]
        read_only_fields = ["id", "cree_le", "modifie_le"]

    def get_hors_service(self, obj):
        return max(obj.total - obj.fonctionnel - obj.a_reparer, 0)

    def validate(self, attrs):
        total = attrs.get("total", getattr(self.instance, "total", 0))
        fonctionnel = attrs.get("fonctionnel", getattr(self.instance, "fonctionnel", 0))
        a_reparer = attrs.get("a_reparer", getattr(self.instance, "a_reparer", 0))
        if fonctionnel > total:
            raise serializers.ValidationError("Le nombre fonctionnel ne peut pas dépasser le total.")
        if fonctionnel + a_reparer > total:
            raise serializers.ValidationError("Fonctionnel + à réparer ne peut pas dépasser le total.")
        return attrs


class SignalementSerializer(serializers.ModelSerializer):
    ecole_nom = serializers.CharField(source="ecole.nom", read_only=True)
    categorie_display = serializers.CharField(source="get_categorie_display", read_only=True)
    origine_display = serializers.CharField(source="get_origine_display", read_only=True)
    statut_display = serializers.CharField(source="get_statut_display", read_only=True)
    auteur_nom = serializers.CharField(source="auteur.nom_complet", read_only=True, default=None)
    traite_par_nom = serializers.CharField(source="traite_par.nom_complet", read_only=True, default=None)

    class Meta:
        model = Signalement
        fields = [
            "id", "ecole", "ecole_nom", "categorie", "categorie_display", "description",
            "origine", "origine_display", "auteur", "auteur_nom", "nom_declarant", "telephone_declarant",
            "statut", "statut_display", "traite_par", "traite_par_nom", "commentaire_traitement",
            "date_traitement", "cree_le", "modifie_le",
        ]
        read_only_fields = [
            "id", "origine", "auteur", "statut", "traite_par", "commentaire_traitement",
            "date_traitement", "cree_le", "modifie_le",
        ]


class SignalementPublicSerializer(serializers.ModelSerializer):
    """US-5.3 : création par un citoyen, sans compte — champs volontairement
    restreints (ni statut, ni traitement, ni auteur interne)."""

    class Meta:
        model = Signalement
        fields = ["id", "ecole", "categorie", "description", "nom_declarant", "telephone_declarant", "cree_le"]
        read_only_fields = ["id", "cree_le"]

    def validate(self, attrs):
        if not attrs.get("nom_declarant") or not attrs.get("telephone_declarant"):
            raise serializers.ValidationError("Le nom et le téléphone du déclarant sont requis.")
        return attrs

    def create(self, validated_data):
        return Signalement.objects.create(origine="citoyen", **validated_data)


class TraiterSignalementSerializer(serializers.Serializer):
    """US-6.2 : ne porte que la décision de traitement."""

    statut = serializers.ChoiceField(
        choices=[StatutSignalement.EN_COURS, StatutSignalement.TRAITE, StatutSignalement.REJETE]
    )
    commentaire_traitement = serializers.CharField(required=False, allow_blank=True, default="")


class InspectionSerializer(serializers.ModelSerializer):
    ecole_nom = serializers.CharField(source="ecole.nom", read_only=True)
    inspecteur_nom = serializers.CharField(source="inspecteur.nom_complet", read_only=True)
    planifie_par_nom = serializers.CharField(source="planifie_par.nom_complet", read_only=True, default=None)
    statut_display = serializers.CharField(source="get_statut_display", read_only=True)

    class Meta:
        model = Inspection
        fields = [
            "id", "ecole", "ecole_nom", "signalement", "inspecteur", "inspecteur_nom",
            "planifie_par", "planifie_par_nom", "date_prevue", "statut", "statut_display",
            "date_realisation", "rapport", "cree_le", "modifie_le",
        ]
        read_only_fields = [
            "id", "planifie_par", "statut", "date_realisation", "rapport", "cree_le", "modifie_le",
        ]


class RapportInspectionSerializer(serializers.Serializer):
    """US-6.4 : consignation du compte-rendu d'une inspection réalisée."""

    date_realisation = serializers.DateField()
    rapport = serializers.CharField()


class MessageContactSerializer(serializers.ModelSerializer):
    """US-5.4 : formulaire de contact public."""

    class Meta:
        model = MessageContact
        fields = ["id", "ecole", "nom", "email", "telephone", "sujet", "message", "cree_le"]
        read_only_fields = ["id", "cree_le"]

    def validate(self, attrs):
        if not attrs.get("email") and not attrs.get("telephone"):
            raise serializers.ValidationError("Indiquez un email ou un téléphone pour que l'on puisse vous répondre.")
        return attrs
