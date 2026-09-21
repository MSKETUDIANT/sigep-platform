from django.contrib import admin

from .models import Equipement, Inspection, MessageContact, Signalement


@admin.register(Equipement)
class EquipementAdmin(admin.ModelAdmin):
    list_display = ("ecole", "type_equipement", "total", "fonctionnel", "a_reparer")
    search_fields = ("type_equipement", "ecole__nom")
    autocomplete_fields = ("ecole",)


@admin.register(Signalement)
class SignalementAdmin(admin.ModelAdmin):
    list_display = ("ecole", "categorie", "origine", "statut", "cree_le")
    list_filter = ("categorie", "origine", "statut")
    search_fields = ("description", "nom_declarant", "ecole__nom")
    autocomplete_fields = ("ecole", "auteur", "traite_par")


@admin.register(Inspection)
class InspectionAdmin(admin.ModelAdmin):
    list_display = ("ecole", "inspecteur", "date_prevue", "statut")
    list_filter = ("statut",)
    search_fields = ("ecole__nom", "inspecteur__nom", "inspecteur__prenoms")
    autocomplete_fields = ("ecole", "inspecteur", "planifie_par", "signalement")


@admin.register(MessageContact)
class MessageContactAdmin(admin.ModelAdmin):
    list_display = ("sujet", "nom", "ecole", "cree_le")
    search_fields = ("sujet", "nom", "message")
    autocomplete_fields = ("ecole",)
