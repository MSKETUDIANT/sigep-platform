from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include("apps.core.urls")),
    path("api/territoire/", include("apps.ref.urls")),
    path("api/comptes/", include("apps.usr.urls")),
    path("api/comptes/", include("apps.org.urls")),
    path("api/etablissements/", include("apps.org.urls_etablissements")),
    path("api/pedagogie/", include("apps.ped.urls")),
    path("api/etablissements/", include("apps.trv.urls")),
    path("api/public/", include("apps.org.urls_public")),
    path("api/public/", include("apps.trv.urls_public")),
]

if settings.DEBUG:
    # En production, un vrai serveur de fichiers (nginx, S3...) doit servir
    # MEDIA_ROOT — Django ne le fait jamais lui-même hors DEBUG.
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
