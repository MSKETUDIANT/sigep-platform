from django.apps import AppConfig


class UsrConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.usr"
    label = "usr"
    verbose_name = "Utilisateurs et profils"
