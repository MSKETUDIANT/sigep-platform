from django.contrib import admin

from .models import ParametreSysteme


@admin.register(ParametreSysteme)
class ParametreSystemeAdmin(admin.ModelAdmin):
    list_display = ("cle", "valeur", "modifie_le")
    search_fields = ("cle", "description")
