from django.apps import AppConfig


class TrvConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.trv"
    label = "trv"
    verbose_name = "Transversal (signalements, inspections, messagerie)"
