# SIGEP — Système Intégré de Gestion de l'Enseignement Préuniversitaire

Plateforme nationale de gestion de l'enseignement préuniversitaire — République de Guinée,
Ministère de l'Éducation Nationale et de l'Alphabétisation.

Développement piloté par le backlog `SIGEP_Backlog_Sprints.pdf` (5 releases, 10 sprints / 20 semaines).
Voir aussi `docs/architecture.md` pour le détail technique.

## État d'avancement

- [x] **Sprint 1 (semaines 1-2)** — Fondation technique + gouvernance territoriale
  - US-0.1 à US-0.5 : backend Django/GeoDjango, frontend Next.js PWA, PostgreSQL+PostGIS, architecture, schéma initial (8 schémas)
  - US-1.1 à US-1.7 : régions, préfectures, sous-préfectures, communes, quartiers (CRUD + API + admin)
- [ ] Sprint 2 — Authentification & comptes territoriaux (EPIC 2)
- [ ] Sprints 3 à 10 — voir le backlog

## Prérequis

- Docker Desktop (recommandé — évite la configuration native de GDAL/GEOS, pénible sous Windows)
- ou, en local : Python 3.12+, Node.js 20+, PostgreSQL 16 + PostGIS, GDAL

## Démarrage rapide (Docker)

```bash
docker compose up --build
```

Puis, dans un second terminal :

```bash
docker compose exec backend python manage.py migrate
docker compose exec backend python manage.py createsuperuser
```

- Frontend : http://localhost:3000
- API : http://localhost:8000/api/health/
- Admin Django : http://localhost:8000/admin/
- API territoriale (EPIC 1) : http://localhost:8000/api/territoire/regions/, `/prefectures/`,
  `/sous-prefectures/`, `/communes/`, `/quartiers/`

## Démarrage sans Docker

```bash
# Backend
cd backend
python -m venv .venv && .venv\Scripts\activate
pip install -r requirements/dev.txt
# Adapter DB_HOST=localhost dans backend/.env (au lieu de "db")
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver

# Frontend (autre terminal)
cd frontend
npm install
npm run dev
```

> GeoDjango sous Windows hors Docker : si `django.core.exceptions.ImproperlyConfigured` mentionne
> GDAL/GEOS introuvables, installer OSGeo4W et renseigner `GDAL_LIBRARY_PATH` /
> `GEOS_LIBRARY_PATH` dans `backend/config/settings/dev.py` (lignes déjà présentes, commentées).

## Structure du dépôt

```
sigep-platform/
├── backend/            # Django + DRF + GeoDjango
│   ├── config/          # settings, urls, wsgi/asgi
│   └── apps/             # 1 app = 1 schéma PostgreSQL (ref, usr, org, ped, ges, trv, aud, sta)
├── frontend/            # Next.js (App Router) + PWA
├── docs/
│   └── architecture.md
└── docker-compose.yml
```

## Icônes PWA

`frontend/public/icons/icon-192.png` et `icon-512.png` sont référencées par `manifest.json` mais pas
encore fournies (aucun asset graphique disponible à ce stade) — à ajouter avant un build de production.
