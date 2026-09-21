# Architecture technique — SIGEP

_US-0.4 : couches back/front/DB séparées et documentées._

## Vue d'ensemble

```
┌─────────────────────┐        ┌──────────────────────────┐        ┌────────────────────┐
│  frontend/ (Next.js) │  HTTP  │   backend/ (Django REST)  │  ORM   │  PostgreSQL+PostGIS │
│  PWA (installable,   │ ─────► │   config/ + apps/<domaine>│ ─────► │  8 schémas logiques  │
│  hors-ligne)         │  JSON  │                            │        │  ref/org/usr/ped/... │
└─────────────────────┘        └──────────────────────────┘        └────────────────────┘
```

## Mapping schéma PostgreSQL ↔ app Django ↔ domaine fonctionnel

| Schéma PG | App Django | Domaine (dossier fonctionnel §15) | Sprint(s) |
|-----------|-----------|-------------------------------------|-----------|
| `ref`     | `apps.ref` | Territoire (régions, préfectures, sous-préfectures, communes, quartiers) | 1 |
| `usr`     | `apps.usr` | Utilisateurs et profils (AUTH_USER_MODEL) | 1 (modèle), 2 (auth complète) |
| `org`     | `apps.org` | Organisation (écoles, directions territoriales, affectation des responsables) | 2, 3 |
| `ped`     | `apps.ped` | Pédagogie (élèves, notes, livrets, cycles, examens) | 5, 6 |
| `ges`     | `apps.ges` | Mobilité et validation (transferts, mutations, circuit à 4 niveaux) | 7, 8 |
| `trv`     | `apps.trv` | Transversal (signalements, inspections, messagerie, notifications) | 4, 9 |
| `aud`     | `apps.aud` | Audit (journal d'activité) | 9 |
| `sta`     | `apps.sta` | Statistiques et tableaux de bord | 9 |

Chaque app Django porte le même `label` que son schéma PostgreSQL (`apps.ref.RefConfig.label = "ref"`,
etc.) et chaque modèle déclare `Meta.db_table = '"<schema>"."<table>"'` — c'est ce qui permet à Django
de créer les tables directement dans le bon schéma PostgreSQL plutôt que dans `public`.

Les schémas eux-mêmes (ainsi que les extensions `postgis`, `pg_trgm`, `unaccent`, `uuid-ossp`,
`pgcrypto`, `btree_gin`, `citext`) sont créés par la migration d'amorçage `apps/core/migrations/0001_initial.py`,
qui doit toujours s'exécuter avant toute autre migration.

## Choix techniques (US-0.1 à US-0.3)

- **Backend** : Django 5 + Django REST Framework + GeoDjango (`django.contrib.gis`), backend DB
  `django.contrib.gis.db.backends.postgis`.
- **Frontend** : Next.js 14 (App Router) + `next-pwa` (manifest + service worker, installable et
  utilisable hors-ligne — icônes PNG 192/512 à fournir avant le build de production).
- **Base de données** : PostgreSQL 16 + PostGIS 3.4 (géolocalisation des écoles — `coordonnees_gps`
  sur `org.Ecole`, à venir Sprint 3).
- **Conteneurisation** : `docker-compose.yml` à la racine (`db`, `backend`, `frontend`) — c'est le mode
  d'exécution recommandé, notamment parce que GeoDjango (GDAL/GEOS) est difficile à configurer
  nativement sous Windows.

## Écart assumé par rapport au DDL brut fourni

Le schéma SQL brut (`SIGEP_Base_de_donnees.sql`) définit des types PostgreSQL `ENUM` natifs
(`ref.statut_activation`, `usr.profil`, etc.). Django ne gère pas nativement les `ENUM` Postgres avec
`ALTER TYPE` lors des migrations ultérieures (ajout de valeur = migration manuelle fragile). Le choix
fait ici est d'utiliser des `CharField(choices=...)` Django (validés en base par les futures
`CheckConstraint`), ce qui reste fonctionnellement équivalent et bien plus simple à faire évoluer au fil
des sprints. Point à confirmer avec l'équipe si une contrainte d'intégrité au niveau SQL pur est requise.

## Décisions Sprint 1 à noter

- `usr.Utilisateur` est posé comme `AUTH_USER_MODEL` dès le Sprint 1 (au lieu d'attendre l'EPIC 2 /
  Sprint 2), pour éviter le piège classique de Django : changer de modèle utilisateur après la première
  migration impose de tout rejouer. Seul le modèle existe pour l'instant — les vues de connexion, l'OTP
  SMS, la réinitialisation de mot de passe et `org.AffectationResponsable` restent prévus au Sprint 2.
- US-1.6 (règle de cohérence schéma A/B) sera portée par les contraintes `CHECK` du futur modèle
  `org.Ecole` (Sprint 3) : `sous_prefecture` XOR `quartier` renseigné.
- Les apps `org`, `ped`, `ges`, `trv`, `aud`, `sta` existent déjà (structure Django) mais sont vides —
  elles seront peuplées au fil des sprints suivants, en gardant la correspondance 1 app = 1 schéma.
