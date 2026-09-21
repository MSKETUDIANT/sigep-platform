from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import Utilisateur


@admin.register(Utilisateur)
class UtilisateurAdmin(UserAdmin):
    model = Utilisateur
    list_display = ("identifiant", "nom", "prenoms", "profil", "statut", "is_active")
    list_filter = ("profil", "statut", "is_active")
    search_fields = ("identifiant", "nom", "prenoms", "email", "telephone")
    ordering = ("nom", "prenoms")

    fieldsets = (
        (None, {"fields": ("identifiant", "password")}),
        ("Identité", {"fields": ("nom", "prenoms", "date_naissance", "sexe", "photo_url")}),
        ("Contact", {"fields": ("email", "telephone")}),
        ("Profil SIGEP", {"fields": ("profil", "statut", "mot_de_passe_provisoire")}),
        ("Sécurité", {"fields": ("otp_actif", "tentatives_echec")}),
        ("Permissions", {"fields": ("is_active", "is_staff", "is_superuser", "groups", "user_permissions")}),
        ("Dates", {"fields": ("last_login", "cree_le", "modifie_le")}),
    )
    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": ("identifiant", "telephone", "profil", "password1", "password2"),
            },
        ),
    )
    readonly_fields = ("cree_le", "modifie_le", "last_login")
