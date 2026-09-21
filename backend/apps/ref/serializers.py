from rest_framework import serializers

from .models import Classe, Commune, Cycle, Prefecture, Quartier, Region, SousPrefecture


class RegionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Region
        fields = "__all__"


class PrefectureSerializer(serializers.ModelSerializer):
    region_nom = serializers.CharField(source="region.nom", read_only=True)

    class Meta:
        model = Prefecture
        fields = "__all__"


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
