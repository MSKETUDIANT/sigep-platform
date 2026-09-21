from django.contrib import admin

from .models import Classe, Commune, Cycle, Prefecture, Quartier, Region, SousPrefecture


@admin.register(Region)
class RegionAdmin(admin.ModelAdmin):
    list_display = ("code", "nom", "type_zone", "nombre_prefectures", "nombre_communes", "actif")
    search_fields = ("nom", "code")
    list_filter = ("type_zone", "actif")


@admin.register(Prefecture)
class PrefectureAdmin(admin.ModelAdmin):
    list_display = ("code", "nom", "region", "actif")
    search_fields = ("nom", "code")
    list_filter = ("region", "actif")
    autocomplete_fields = ("region",)


@admin.register(SousPrefecture)
class SousPrefectureAdmin(admin.ModelAdmin):
    list_display = ("code", "nom", "prefecture", "statut", "nombre_ecoles")
    search_fields = ("nom", "code")
    list_filter = ("statut", "prefecture__region")
    autocomplete_fields = ("prefecture", "creee_par")
    readonly_fields = ("code",)


@admin.register(Commune)
class CommuneAdmin(admin.ModelAdmin):
    list_display = ("code", "nom", "region", "type_commune", "actif")
    search_fields = ("nom", "code")
    list_filter = ("region", "type_commune", "actif")
    autocomplete_fields = ("region", "prefecture")


@admin.register(Quartier)
class QuartierAdmin(admin.ModelAdmin):
    list_display = ("code", "nom", "commune", "statut", "nombre_ecoles")
    search_fields = ("nom", "code")
    list_filter = ("statut", "commune")
    autocomplete_fields = ("commune", "cree_par")
    readonly_fields = ("code",)


@admin.register(Cycle)
class CycleAdmin(admin.ModelAdmin):
    list_display = ("code", "libelle", "duree_annees", "examen_fin", "ordre")


@admin.register(Classe)
class ClasseAdmin(admin.ModelAdmin):
    list_display = ("code", "libelle", "cycle", "niveau", "est_classe_fin", "ordre")
    list_filter = ("cycle",)
    search_fields = ("code", "libelle")
