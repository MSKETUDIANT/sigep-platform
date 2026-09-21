from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import ParametreSystemeViewSet, health_check, sauvegardes

router = DefaultRouter()
router.register("parametres", ParametreSystemeViewSet, basename="parametre")

urlpatterns = [
    path("health/", health_check, name="health-check"),
    path("sauvegardes/", sauvegardes, name="sauvegardes"),
] + router.urls
