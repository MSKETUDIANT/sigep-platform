from django.contrib import admin

from .models import AffectationResponsable


@admin.register(AffectationResponsable)
class AffectationResponsableAdmin(admin.ModelAdmin):
    list_display = (
        "utilisateur", "profil", "sous_prefecture", "commune", "prefecture", "region",
        "statut", "date_debut", "date_fin",
    )
    list_filter = ("profil", "statut")
    search_fields = ("utilisateur__identifiant", "utilisateur__nom", "utilisateur__prenoms")
    autocomplete_fields = ("utilisateur", "sous_prefecture", "commune", "prefecture", "region", "affecte_par")
    readonly_fields = ("cree_le", "modifie_le")
