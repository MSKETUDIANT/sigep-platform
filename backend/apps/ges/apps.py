from django.apps import AppConfig


class GesConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.ges"
    label = "ges"
    verbose_name = "Gestion (transferts, mutations, circuit de validation)"
