from django.contrib import admin

from .models import Equipement


@admin.register(Equipement)
class EquipementAdmin(admin.ModelAdmin):
    list_display = ("ecole", "type_equipement", "total", "fonctionnel", "a_reparer")
    search_fields = ("type_equipement", "ecole__nom")
    autocomplete_fields = ("ecole",)
