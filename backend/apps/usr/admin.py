from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import Enseignant, InterventionEnseignant, Utilisateur


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


@admin.register(Enseignant)
class EnseignantAdmin(admin.ModelAdmin):
    list_display = ("matricule", "utilisateur", "matiere_principale", "statut_enseignant")
    list_filter = ("statut_enseignant",)
    search_fields = ("matricule", "utilisateur__nom", "utilisateur__prenoms")
    autocomplete_fields = ("utilisateur",)
    readonly_fields = ("matricule", "cree_le", "modifie_le")


@admin.register(InterventionEnseignant)
class InterventionEnseignantAdmin(admin.ModelAdmin):
    list_display = ("enseignant", "ecole", "classe", "matiere", "volume_horaire_hebdo", "annee_academique", "actif")
    list_filter = ("actif", "annee_academique")
    search_fields = ("enseignant__matricule", "matiere")
    autocomplete_fields = ("enseignant", "ecole", "classe")
