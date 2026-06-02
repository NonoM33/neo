# Neo Domotique — Monorepo

> Plateforme domotique white-label : pilotage, supervision et commercialisation
> d'installations domotiques pour intégrateurs et clients finaux.

Ce dépôt est un **monorepo** : toutes les applications du produit Neo Domotique
(API, back-office, CRM commercial, site vitrine, application terrain, control plane
cloud) vivent ici et partagent un cycle de versionnage et de déploiement commun.

---

## Sommaire

- [Architecture](#architecture)
- [Applications](#applications)
- [Stack technique](#stack-technique)
- [Structure du dépôt](#structure-du-dépôt)
- [Prérequis](#prérequis)
- [Démarrage local](#démarrage-local)
- [Tests & qualité](#tests--qualité)
- [Déploiement (Coolify)](#déploiement-coolify)
- [Environnements & domaines](#environnements--domaines)
- [Conventions](#conventions)

---

## Architecture

```
                          ┌────────────────────────┐
                          │      Clients finaux      │
                          │   (web + app mobile)     │
                          └───────────┬──────────────┘
                                      │
        ┌─────────────────────────────┼──────────────────────────────┐
        │                             │                              │
┌───────▼────────┐          ┌─────────▼─────────┐          ┌─────────▼─────────┐
│  site-vitrine  │          │   integrateur-app  │          │   crm-commercial  │
│   (Astro/SSG)  │          │   (Flutter terrain)│          │   (React staff)   │
└───────┬────────┘          └─────────┬─────────┘          └─────────┬─────────┘
        │                             │                              │
        └─────────────────────────────┼──────────────────────────────┘
                                      │  HTTPS / JWT
                          ┌───────────▼──────────────┐
                          │         backend           │
                          │  Bun + Hono + Drizzle      │
                          │  API REST + back-office     │
                          │  (JSX/HTMX) + IA support     │
                          └───┬───────────┬────────────┘
                              │           │
                   ┌──────────▼──┐   ┌────▼─────────┐
                   │ PostgreSQL  │   │ MinIO (S3)   │
                   └─────────────┘   └──────────────┘

        ┌────────────────────────────────────────────────────┐
        │  neo-cloud : control plane box locale (HA OS) ↔ cloud │
        │  whisper-proxy : speech-to-text (Parakeet)            │
        └────────────────────────────────────────────────────┘
```

Le **backend** est le cœur du système : il expose l'API REST (staff + clients),
sert le back-office (JSX rendus par Hono, interactivité HTMX) et l'assistant IA de
support. Les front-ends (site vitrine, CRM, app terrain) consomment cette API.
`neo-cloud` gère le plan de contrôle entre les box domotiques locales (Home Assistant
OS) et le cloud ; `whisper-proxy` fournit la transcription vocale.

---

## Applications

| Dossier | Rôle | Stack | Déploiement |
|---|---|---|---|
| [`backend`](backend) | API REST (staff + clients) + back-office + IA support | Bun · Hono · Drizzle · PostgreSQL · MinIO · Zod | `neo-backend` (prod) / `neo-backend-stg` |
| [`crm-commercial`](crm-commercial) | CRM commercial (app « staff ») | React 19 · TypeScript · Vite · Zustand · React Router · Recharts · FullCalendar | `neo-crm` (prod) / `neo-crm-stg` |
| [`site-vitrine`](site-vitrine) | Site vitrine public | Astro · Tailwind · Three.js · GSAP | `Neo Site Vitrine` (prod) / `neo-site-vitrine-stg` |
| [`integrateur-app`](integrateur-app) | App tablette intégrateurs terrain | Flutter (Dart) | Build mobile (hors Coolify) |
| [`neo-cloud`](neo-cloud) | Control plane box locale (HA OS) ↔ cloud | Home Assistant custom components · Docker | Infra dédiée |
| [`whisper-proxy`](whisper-proxy) | Proxy speech-to-text | Python (Parakeet) · Nginx · Docker | Infra dédiée |

---

## Stack technique

**Backend** — Runtime [Bun](https://bun.sh), framework [Hono](https://hono.dev),
ORM [Drizzle](https://orm.drizzle.team) sur PostgreSQL, stockage objet MinIO
(compatible S3), validation [Zod](https://zod.dev), authentification JWT (tokens
séparés staff / clients). Back-office rendu côté serveur en JSX + HTMX (Bootstrap 5.3).
Assistant IA via l'API Anthropic Claude.

**CRM commercial** — React 19 + TypeScript, build [Vite](https://vitejs.dev), état
global [Zustand](https://zustand-demo.pmnd.rs), client HTTP Axios, UI Bootstrap,
graphiques Recharts, calendrier FullCalendar, drag & drop dnd-kit.

**Site vitrine** — [Astro](https://astro.build) (génération statique), Tailwind CSS,
animations Three.js + GSAP + Lenis.

**App terrain** — Flutter, destinée aux tablettes des intégrateurs sur chantier.

**Migrations DB** — Drizzle, appliquées automatiquement au démarrage du backend
(migrate-on-boot). Génération : `bun run db:generate`.

---

## Structure du dépôt

```
neo/
├── backend/             # API + back-office + IA (Bun/Hono/Drizzle)
├── crm-commercial/      # CRM staff (React/Vite)
├── site-vitrine/        # Site public (Astro)
├── integrateur-app/     # App terrain (Flutter)
├── neo-cloud/           # Control plane box/cloud (HA OS)
├── whisper-proxy/       # STT proxy (Parakeet)
├── scripts/             # Outils & git-hooks
├── BUSINESS_PLAN_DOMOTIQUE.md
└── STATUS.md
```

Chaque application est autonome (ses dépendances, ses tests, son Dockerfile) et se
déploie indépendamment sur Coolify via son **base directory** et sa **branche**.

---

## Prérequis

- [Bun](https://bun.sh) ≥ 1.3 (backend)
- [Node.js](https://nodejs.org) ≥ 20 + npm (CRM, site vitrine)
- [Flutter](https://flutter.dev) (app terrain)
- [Docker](https://www.docker.com) + Docker Compose (PostgreSQL, MinIO en local)

---

## Démarrage local

### Backend

```bash
cd backend
docker compose up -d          # PostgreSQL + MinIO
cp .env.example .env          # puis renseigner les variables
bun install
bun run db:push               # applique le schéma
bun run dev                   # http://localhost:3000
```

### CRM commercial

```bash
cd crm-commercial
npm install
npm run dev                   # http://localhost:5173
```

### Site vitrine

```bash
cd site-vitrine
npm install
npm run dev                   # http://localhost:4321
```

### App terrain (Flutter)

```bash
cd integrateur-app
flutter pub get
flutter run
```

---

## Tests & qualité

```bash
# Backend (Bun test runner)
cd backend && bun test
cd backend && bun run typecheck

# CRM
cd crm-commercial && npm run lint && npm run build

# App terrain
cd integrateur-app && flutter test
```

Le projet suit une discipline **TDD** et une **non-régression obligatoire** : tout
correctif de bug doit s'accompagner d'un test qui échoue sur l'ancien code et passe
sur le nouveau. Linting strict, typage strict (zéro `any`), commits conventionnels.

---

## Déploiement (Coolify)

Le déploiement est géré par [Coolify](https://coolify.io). Chaque application est une
ressource Coolify qui pointe sur **ce monorepo**, une **branche** et un **base
directory**. Le déploiement est automatique sur push (CI/CD GitLab → Coolify).

| Branche | Environnement | Cible |
|---|---|---|
| `main` | **production** | apps `*` (prod) |
| `stg` | **staging** | apps `*-stg` |

Workflow : `feature` → `stg` (validation/recette) → `main` (production).

---

## Environnements & domaines

| Application | Production | Staging |
|---|---|---|
| Backend (API + back-office) | `api.neo-domotique.fr` | `stg.api.neo-domotique.fr` |
| CRM commercial (staff) | `staff.neo-domotique.fr` | `stg.staff.neo-domotique.fr` |
| Site vitrine | `neo-domotique.fr` | `stg.neo-domotique.fr` |

Le **centre de recette** (`/backoffice/recette`) est disponible hors production
(staging + dev) : il pilote la validation des features et la remontée de bugs, avec
création automatique de tickets GitLab.

---

## Conventions

- **Branches** : `main` (prod), `stg` (staging), `feature/*` (développement).
- **Commits** : conventionnels (`feat:`, `fix:`, `refactor:`, `test:`, `docs:`,
  `chore:`), atomiques.
- **Architecture** : Clean Architecture + découpage par feature/module métier.
- **Sécurité** : aucun secret committé ; toutes les variables sensibles vivent dans
  Coolify / les variables CI GitLab.

---

© Neo Domotique — dépôt privé.
