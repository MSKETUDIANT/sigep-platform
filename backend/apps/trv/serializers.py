from rest_framework import serializers

from .models import Equipement


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
