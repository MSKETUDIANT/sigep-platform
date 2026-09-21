from django.contrib import admin

from .models import AffectationResponsable, Ecole


@admin.register(AffectationResponsable)
class AffectationResponsableAdmin(admin.ModelAdmin):
    list_display = (
        "utilisateur", "profil", "sous_prefecture", "commune", "prefecture", "region",
        "statut", "date_debut", "date_fin",
    )
    list_filter = ("profil", "statut")
    search_fields = ("utilisateur__identifiant", "utilisateur__nom", "utilisateur__prenoms")
    autocomplete_fields = (
        "utilisateur", "sous_prefecture", "commune", "prefecture", "region", "ecole", "affecte_par",
    )
    readonly_fields = ("cree_le", "modifie_le")


@admin.register(Ecole)
class EcoleAdmin(admin.ModelAdmin):
    list_display = (
        "code_ecole", "nom", "schema_identification", "type_ecole", "etat_general", "region", "actif",
    )
    list_filter = ("schema_identification", "type_ecole", "etat_general", "actif", "region")
    search_fields = ("nom", "code_ecole")
    autocomplete_fields = ("sous_prefecture", "prefecture", "commune", "quartier", "region", "directeur")
    readonly_fields = ("code_ecole", "prefecture", "commune", "region", "cree_le", "modifie_le")
