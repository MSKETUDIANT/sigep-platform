from rest_framework import viewsets

from apps.core.permissions import LectureAuthentifieEcritureSuperAdmin
from apps.org.services import ecoles_visibles

from .models import Equipement
from .serializers import EquipementSerializer


class EquipementViewSet(viewsets.ModelViewSet):
    """US-4.4 : inventaire d'équipements, borné au périmètre du profil connecté."""

    serializer_class = EquipementSerializer
    permission_classes = [LectureAuthentifieEcritureSuperAdmin]
    filterset_fields = ["ecole"]

    def get_queryset(self):
        return Equipement.objects.select_related("ecole").filter(ecole__in=ecoles_visibles(self.request.user))
