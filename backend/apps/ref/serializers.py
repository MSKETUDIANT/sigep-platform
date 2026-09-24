from rest_framework import serializers

from .models import Classe, Commune, Cycle, Prefecture, Quartier, Region, SousPrefecture


class RegionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Region
        fields = "__all__"
        read_only_fields = ("code",)


class PrefectureSerializer(serializers.ModelSerializer):
    region_nom = serializers.CharField(source="region.nom", read_only=True)

    class Meta:
        model = Prefecture
        fields = "__all__"
        read_only_fields = ("code",)

    def validate_region(self, region):
        """§2.1 : Conakry est une zone spéciale, rattachée directement au
        schéma B (Quartier -> Commune -> Région) — elle n'a jamais de
        préfecture."""
        if region.type_zone == "zone_speciale":
            raise serializers.ValidationError(
                f"{region.nom} est une zone spéciale : elle n'a pas de préfecture (schéma B uniquement)."
            )
        return region


class SousPrefectureSerializer(serializers.ModelSerializer):
    prefecture_nom = serializers.CharField(source="prefecture.nom", read_only=True)
    region_nom = serializers.CharField(source="prefecture.region.nom", read_only=True)

    class Meta:
        model = SousPrefecture
        fields = "__all__"
        read_only_fields = ("code",)


class CommuneSerializer(serializers.ModelSerializer):
    region_nom = serializers.CharField(source="region.nom", read_only=True)

    class Meta:
        model = Commune
        fields = "__all__"
        read_only_fields = ("code",)


class QuartierSerializer(serializers.ModelSerializer):
    commune_nom = serializers.CharField(source="commune.nom", read_only=True)

    class Meta:
        model = Quartier
        fields = "__all__"
        read_only_fields = ("code",)


class CycleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Cycle
        fields = "__all__"


class ClasseSerializer(serializers.ModelSerializer):
    cycle_libelle = serializers.CharField(source="cycle.libelle", read_only=True)

    class Meta:
        model = Classe
        fields = "__all__"
