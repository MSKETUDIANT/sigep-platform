from django.contrib import admin

from .models import Eleve, Filiation


class FiliationInline(admin.TabularInline):
    model = Filiation
    extra = 0


@admin.register(Eleve)
class EleveAdmin(admin.ModelAdmin):
    list_display = ("matricule", "nom", "prenoms", "sexe", "ecole", "classe", "statut")
    list_filter = ("statut", "sexe", "classe")
    search_fields = ("matricule", "nom", "prenoms")
    autocomplete_fields = ("ecole", "classe")
    readonly_fields = ("matricule", "cree_le", "modifie_le")
    inlines = [FiliationInline]


@admin.register(Filiation)
class FiliationAdmin(admin.ModelAdmin):
    list_display = ("eleve", "lien", "nom_complet", "telephone", "urgence")
    list_filter = ("lien", "urgence")
    search_fields = ("eleve__matricule", "eleve__nom", "nom_complet")
    autocomplete_fields = ("eleve",)
