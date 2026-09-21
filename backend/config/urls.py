from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include("apps.core.urls")),
    path("api/territoire/", include("apps.ref.urls")),
    path("api/comptes/", include("apps.usr.urls")),
    path("api/comptes/", include("apps.org.urls")),
    path("api/etablissements/", include("apps.org.urls_etablissements")),
]
