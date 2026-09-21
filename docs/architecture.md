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
  migration impose de tout rejouer.
- US-1.6 (règle de cohérence schéma A/B) sera portée par les contraintes `CHECK` du futur modèle
  `org.Ecole` (Sprint 3) : `sous_prefecture` XOR `quartier` renseigné.
- Les apps `ped`, `ges`, `trv`, `sta` existent déjà (structure Django) mais restent vides — elles seront
  peuplées au fil des sprints suivants, en gardant la correspondance 1 app = 1 schéma.

## API — Sprint 2 (authentification & comptes, EPIC 2)

Authentification par **JWT** (`djangorestframework-simplejwt`) — choix motivé par le découplage
backend/frontend (Next.js consomme l'API comme n'importe quel client, pas de session/cookie partagé
requis). Jeton d'accès : 8h ; jeton de rafraîchissement : 7j, avec rotation.

| Endpoint | Méthode | Rôle |
|---|---|---|
| `/api/comptes/connexion/` | POST | US-2.1 — identifiant + mot de passe -> tokens JWT + profil (refuse les comptes non "actif") |
| `/api/comptes/rafraichir/` | POST | Renouvellement du jeton d'accès |
| `/api/comptes/moi/` | GET | Utilisateur courant (pour la redirection frontend vers l'espace du profil) |
| `/api/comptes/utilisateurs/` | GET/POST | US-2.2 — création de compte (Super Admin uniquement), mot de passe provisoire généré automatiquement |
| `/api/comptes/utilisateurs/{id}/revoquer/` | POST | US-2.5 — révocation, accès bloqué immédiatement (`is_active=False`) |
| `/api/comptes/utilisateurs/{id}/reinitialiser_mot_de_passe/` | POST | US-2.7 — reset admin, nouveau mot de passe provisoire renvoyé une seule fois |
| `/api/comptes/affectations/` | GET/POST | US-2.3 — affectation d'un responsable (DSE/DCE/DPE/IR) à son périmètre unique |
| `/api/comptes/affectations/{id}/reaffecter/` | POST | US-2.4 — clôture l'affectation active et en ouvre une nouvelle, tracée dans `aud.JournalActivite` |

**Matrice des droits (US-2.6)** — implémentée pour l'instant sur le référentiel territorial et la
gestion des comptes : `apps.core.permissions.LectureAuthentifieEcritureSuperAdmin` (lecture pour tout
compte authentifié, écriture réservée au Super Admin) sur `apps.ref` ; `EstSuperAdmin` (accès total
réservé) sur `apps.usr` et `apps.org`. Le reste de la matrice §17 (par périmètre territorial DSE/DCE/
DPE/IR) sera affiné au fur et à mesure que les modules concernés existeront.

**`org.AffectationResponsable`** : `ecole_id` reste un `UUIDField` brut (pas de `ForeignKey`) tant que
`org.Ecole` n'existe pas (Sprint 3) — un `directeur_ecole` ne peut donc pas encore être affecté via cette
API, ce sera ajouté avec `org.Ecole`.

**US-2.8 (sauvegardes)** : `python manage.py backup_db` (pg_dump, format custom) — voir le docstring de
la commande pour la planification (cron/Tâches planifiées) et la restauration (`pg_restore`).

**US-2.9 (paramètres système)** : `apps.core.ParametreSysteme`, clé/valeur générique, gérable depuis
l'admin Django — pas d'API dédiée pour l'instant (pas de besoin identifié côté frontend à ce stade).

**US-2.10 (OTP SMS) — non implémenté.** Les champs `otp_secret`/`otp_actif` existent déjà sur
`usr.Utilisateur` (Sprint 1) mais aucune passerelle SMS n'a été choisie ni configurée ; construire la
vérification OTP sans provider réel produirait une fausse impression de fonctionnalité. À reprendre dès
qu'un fournisseur (Twilio, Africa's Talking, Orange SMS API...) est désigné.
