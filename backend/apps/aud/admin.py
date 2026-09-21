from django.contrib import admin

from .models import JournalActivite


@admin.register(JournalActivite)
class JournalActiviteAdmin(admin.ModelAdmin):
    list_display = ("horodatage", "acteur", "action", "cible_type", "cible_id")
    list_filter = ("action",)
    search_fields = ("cible_type", "cible_id", "detail", "acteur__identifiant")
    readonly_fields = ("acteur", "action", "cible_type", "cible_id", "detail", "horodatage")

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
