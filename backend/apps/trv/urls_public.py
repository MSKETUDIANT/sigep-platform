"""Routes du portail citoyen (EPIC 5) — aucune authentification requise.
Distinctes de urls.py (bornées au périmètre, réservées aux comptes)."""
from django.urls import path

from .views import MessageContactPublicView, SignalementPublicView

urlpatterns = [
    path("signalements/", SignalementPublicView.as_view(), name="signalement-public"),
    path("messages-contact/", MessageContactPublicView.as_view(), name="message-contact-public"),
]
