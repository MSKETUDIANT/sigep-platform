from django.apps import AppConfig


class AudConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.aud"
    label = "aud"
    verbose_name = "Audit et journalisation"
