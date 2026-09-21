from django.apps import AppConfig


class PedConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.ped"
    label = "ped"
    verbose_name = "Pédagogie (élèves, notes, livrets)"
