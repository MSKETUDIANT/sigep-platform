from rest_framework.pagination import PageNumberPagination


class PaginationStandard(PageNumberPagination):
    """Pagination par défaut de l'API — taille de page ajustable par le client
    (?page_size=) pour le sélecteur "Afficher N par page" du frontend."""

    page_size = 25
    page_size_query_param = "page_size"
    max_page_size = 100
