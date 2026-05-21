# 📊 Neo Domotique — État de l'ERP

> Snapshot généré le **jeudi 21 mai 2026 à 15:53** — branche `main`

> 🔄 Pour le dashboard temps réel : `bun run _status/server.ts` puis http://localhost:4321

## 🎯 Vue d'ensemble

| Métrique | Valeur |
|---|---|
| Lignes de code total | **110 412** |
| Fichiers source | 566 |
| Tests | **13** fichiers |
| Modules backend | 25 |
| Écrans intégrateur | 10 |
| Pages CRM | 10 |
| Fichiers > 300L | 106 (cible: 0) |
| TODOs / FIXMEs | 20 |
| Commits 30 derniers jours | 8 |

## 🩺 Santé du projet

- 🔴 **Tests Flutter** — 13 tests — couverture critique
- 🔴 **Fichiers monstres** — backend/src/backoffice/backoffice.routes.tsx : 3021 lignes (max recommandé 300)
- 🟠 **TODOs/FIXMEs** — 20 marqueurs dans le code
- ✅ **Branche locale** — à jour avec origin/main

## 📦 Projets

| | Projet | Stack | LOC | Fichiers | Tests |
|---|---|---|---:|---:|---:|
| 🛠️ | **Backend** | Hono + Bun + Drizzle + Postgres | 42 735 | 260 | 0 |
| 📱 | **App Intégrateur** | Flutter (BLoC + Hive + Dio + RoomPlan LiDAR) | 46 314 | 161 | 13 |
| 📞 | **CRM Commercial** | React 19 + Vite + Zustand | 17 285 | 115 | 0 |
| 🌐 | **Site Vitrine** | Astro + Tailwind | 3 882 | 28 | 0 |
| ☁️ | **Neo Cloud** | Home Assistant custom + Docker | 81 | 1 | 0 |
| 🎙️ | **Whisper Proxy** | Python + Parakeet | 115 | 1 | 0 |

### 🛠️ Backend

API REST principale, Swagger, 25 modules métier, signatures Documenso, S3, JWT

- Stack : Hono + Bun + Drizzle + Postgres
- LOC : **42 735** dans 260 fichiers
- Tests : 0

### 📱 App Intégrateur

App tablette terrain — audit, photos, plan 2D/3D, devis, signature électronique native

- Stack : Flutter (BLoC + Hive + Dio + RoomPlan LiDAR)
- LOC : **46 314** dans 161 fichiers
- Tests : 13

### 📞 CRM Commercial

Prospection, RDV Calendly, leads, calls + qualif IA Whisper/Claude, KPI, leaderboard

- Stack : React 19 + Vite + Zustand
- LOC : **17 285** dans 115 fichiers
- Tests : 0

### 🌐 Site Vitrine

Vitrine commerciale, audit conversion, formulaires, booking public

- Stack : Astro + Tailwind
- LOC : **3 882** dans 28 fichiers
- Tests : 0

### ☁️ Neo Cloud

Provisioning auto d'instances HA white-label, custom components

- Stack : Home Assistant custom + Docker
- LOC : **81** dans 1 fichiers
- Tests : 0

### 🎙️ Whisper Proxy

Transcription audio locale (NVIDIA Parakeet) pour les appels CRM

- Stack : Python + Parakeet
- LOC : **115** dans 1 fichiers
- Tests : 0

## 🛠️ Modules backend

`activities` · `appointments` · `auth` · `booking` · `calendar-sync` · `calls` · `cloud-instances` · `devices` · `floor-plans` · `invoices` · `kpis` · `leads` · `orders` · `photos` · `products` · `projects` · `quotes` · `rooms` · `scan-sessions` · `signatures` · `stock` · `supplier-orders` · `sync` · `tracking` · `users`

## 📱 Écrans intégrateur

`appointments` · `audit` · `auth` · `catalogue` · `dashboard` · `floor_plan` · `homes` · `projects` · `quotes` · `tickets`

### Blocs

`appointments` · `audit` · `auth` · `catalogue` · `dashboard` · `floor_plan` · `homes` · `projects` · `quotes` · `sync` · `tech_audit` · `tickets`

## 📞 Pages CRM

`activities` · `auth` · `calendar` · `cloud` · `dashboard` · `kpis` · `leaderboard` · `leads` · `profile` · `prospection`

## 🐘 Fichiers monstres (>300 lignes)

Le CLAUDE.md global impose une cible de **200-300 lignes max par fichier**. 106 fichiers dépassent.

| Lignes | Fichier |
|---:|---|
| 3021 | `backend/src/backoffice/backoffice.routes.tsx` |
| 2103 | `integrateur-app/lib/presentation/screens/projects/project_detail_screen.dart` |
| 2019 | `integrateur-app/lib/presentation/screens/audit/audit_screen.dart` |
| 1989 | `crm-commercial/src/pages/prospection/ProspectionHubPage.tsx` |
| 1635 | `backend/src/modules/appointments/appointments.service.ts` |
| 1463 | `integrateur-app/lib/presentation/screens/homes/homes_screen.dart` |
| 1296 | `integrateur-app/lib/presentation/screens/catalogue/product_detail_screen.dart` |
| 1237 | `integrateur-app/lib/presentation/screens/appointments/appointment_detail_screen.dart` |
| 1234 | `integrateur-app/lib/presentation/screens/floor_plan/floor_plan_screen.dart` |
| 1204 | `integrateur-app/lib/presentation/widgets/floor_plan/properties_panel.dart` |
| 1067 | `integrateur-app/lib/presentation/screens/appointments/calendar_screen.dart` |
| 1030 | `integrateur-app/lib/presentation/screens/quotes/quote_screen.dart` |
| 1026 | `backend/src/support/tickets/tickets.service.ts` |
| 851 | `integrateur-app/lib/presentation/screens/appointments/tech_audit_screen.dart` |
| 832 | `integrateur-app/lib/presentation/screens/tickets/ticket_detail_screen.dart` |
| 800 | `backend/src/backoffice/pages/projects/detail.tsx` |
| 791 | `integrateur-app/lib/presentation/screens/projects/projects_list_screen.dart` |
| 783 | `integrateur-app/lib/presentation/screens/tickets/tickets_list_screen.dart` |
| 757 | `backend/src/backoffice/pages/products/form.tsx` |
| 757 | `crm-commercial/src/pages/dashboard/DashboardPage.tsx` |
| … | _… 86 autres_ |

## 📝 TODOs / FIXMEs

- **TODO** `backend/src/modules/invoices/invoices.routes.ts:122` — Endpoint pour générer le PDF
- **TODO** `backend/src/modules/quotes/quotes.service.ts:352` — Actually send email with PDF
- **TODO** `site-vitrine/src/config/site.ts:2` — remplacer toutes les valeurs par les vraies informations
- **TODO** `site-vitrine/src/config/site.ts:11` — remplacer
- **TODO** `site-vitrine/src/config/site.ts:12` — remplacer
- **TODO** `site-vitrine/src/config/site.ts:13` — remplacer
- **TODO** `site-vitrine/src/config/site.ts:14` — remplacer
- **TODO** `site-vitrine/src/config/site.ts:18` — remplacer
- **TODO** `site-vitrine/src/config/site.ts:19` — remplacer
- **TODO** `site-vitrine/src/config/site.ts:20` — remplacer
- **TODO** `site-vitrine/src/config/site.ts:28` — remplacer
- **XXX** `site-vitrine/src/config/site.ts:29` — XXX XXX', // TODO: remplacer
- **XXX** `site-vitrine/src/config/site.ts:30` — XXX XXX XXXXX', // TODO: remplacer
- **XXX** `site-vitrine/src/config/site.ts:31` — XXX XXX', // TODO: remplacer
- **TODO** `site-vitrine/src/config/site.ts:33` — remplacer
- **TODO** `site-vitrine/src/config/site.ts:43` — remplacer
- **TODO** `site-vitrine/src/config/site.ts:44` — remplacer
- **TODO** `site-vitrine/src/config/site.ts:45` — remplacer
- **TODO** `site-vitrine/src/config/site.ts:55` — remplacer par l'ID Formspree
- **TODO** `site-vitrine/src/config/site.ts:58` — remplacer si différent

## 🗺️ Roadmap

### Sprint Qualité (en cours)

- [x] Tests repositories (project, quote, catalogue, floor_plan) _(82 tests)_
- [x] Tests blocs (projects, quotes, audit, floor_plan) _(62 tests)_
- [x] Fix 3 tests AuthRepository pré-existants
- [x] Hook pre-commit flutter test bloquant _(scripts/git-hooks/)_
- [x] Refacto audit_screen round 1 _(2621 → 2018 lignes)_
- [x] CRM noUnusedLocals/Params ré-activé
- [~] Refacto audit_screen rounds 2-4 _(Encore 2018L, cible ~300L)_
- [ ] Refacto project_detail_screen.dart _(2102L intact)_
- [ ] Tests blocs restants (catalogue, dashboard, homes, sync, tech_audit, tickets, appointments)
- [ ] Tests repositories restants (auth*, device, user, sync, ticket, appointment)

### Sprint Sync & Offline polish (prévu)

- [ ] Sync robuste backend ↔ app (offline-first)
- [ ] Gestion des conflits sync
- [ ] Upload photos background avec retry queue
- [ ] Indicateur sync UI temps réel

### Sprint Devis → Facturation → Stock (prévu)

- [ ] Workflow devis signé → bon de commande fournisseur
- [ ] Réception stock + scan QR
- [ ] Facturation client
- [ ] Paiements (intégration Stripe ou virement)

### Sprint CRM × App — unifier l'écosystème (prévu)

- [ ] Dispatching auto leads CRM → intégrateurs app
- [ ] KPI temps réel partagés CRM/app
- [ ] Vue commerciale 360° client

### Dette technique observée

- [~] 106 fichiers > 300L à découper
- [~] 13 tests — cible 80% couverture (CLAUDE.md global)
- [ ] Migrations DB : passer du programmatique à drizzle-kit migrate propre
- [ ] Backend : split modules > 1000L (appointments.service.ts 1634L)

## 📜 Derniers commits

| SHA | Message | Auteur | Date |
|---|---|---|---|
| `2e9cf5d` | fix(crm): re-enable noUnusedLocals/Params, remove dead formatter helpers | cosson renaud | 2026-05-21 15:41 |
| `b4d8a3f` | refactor(integrateur-app): extract audit_screen helpers + sheets/dialogs | cosson renaud | 2026-05-21 15:33 |
| `d27de7d` | chore: add versioned pre-commit hook running flutter test | cosson renaud | 2026-05-21 15:22 |
| `af970c9` | test(integrateur-app): add AuditBloc + FloorPlanBloc tests | cosson renaud | 2026-05-21 15:07 |
| `38dd4e8` | test(integrateur-app): add ProjectsBloc + QuotesBloc tests | cosson renaud | 2026-05-21 15:01 |
| `f9acf17` | test(integrateur-app): add CatalogueRepository + FloorPlanRepository tests | cosson renaud | 2026-05-21 14:56 |
| `7aa8042` | test(integrateur-app): add ProjectRepository + QuoteRepository tests, fix AuthRepository fixtures | cosson renaud | 2026-05-21 14:53 |
| `ac9e9b3` | chore(floor_plan): remove dead code lines at end of canvas widget | cosson renaud | 2026-05-21 14:53 |
| `4aae0c7` | feat: signature électronique native Flutter (sans WebView) | cosson renaud | 2026-03-18 18:45 |
| `17c8b48` | feat: floor plan improvements + fix photo upload and touch drag | cosson renaud | 2026-03-18 18:42 |
| `e3ef0cc` | fix: add programmatic migration script, run at container start | cosson renaud | 2026-03-18 11:27 |
| `0de3f28` | feat: upload fichiers USDZ 3D vers S3 après scan LiDAR | cosson renaud | 2026-03-18 11:26 |
| `1e6d38e` | fix: use db:migrate instead of push (non-interactive) | cosson renaud | 2026-03-18 11:25 |
| `975f7ed` | fix: install all deps for drizzle-kit, run push+seed at startup | cosson renaud | 2026-03-18 11:22 |
| `efc666b` | fix: run db:push and db:seed before start in Dockerfile | cosson renaud | 2026-03-18 11:20 |
