# Neo CRM Commercial

Application CRM pour les commerciaux de Neo Domotique.

## Stack Technique

- **Framework**: React 19 + TypeScript
- **Build**: Vite
- **Routing**: React Router v7
- **State**: Zustand
- **HTTP**: Axios
- **UI**: Bootstrap 5.3 + Bootstrap Icons
- **Style**: CSS Modules / Variables CSS

## API Backend

Base URL: `http://localhost:3000/api`

### Endpoints CRM

```
Auth:
POST   /auth/login          - Connexion
POST   /auth/refresh         - Refresh token
GET    /auth/me              - Utilisateur courant

Leads:
GET    /leads                - Liste leads (filtres: status, source, search)
GET    /leads/stats          - Stats pipeline
GET    /leads/:id            - Detail lead
POST   /leads                - Creer lead
PUT    /leads/:id            - Modifier lead
PUT    /leads/:id/status     - Changer statut
POST   /leads/:id/convert    - Convertir en projet
DELETE /leads/:id            - Supprimer

Activities:
GET    /activities           - Liste activites
GET    /activities/upcoming  - Activites a venir
GET    /activities/:id       - Detail
POST   /activities           - Creer
PUT    /activities/:id       - Modifier
POST   /activities/:id/complete - Terminer
DELETE /activities/:id       - Supprimer

KPIs:
GET    /kpis/dashboard       - Dashboard
GET    /kpis/pipeline        - Analyse pipeline
GET    /kpis/conversions     - Taux conversion
GET    /kpis/revenue         - Stats CA
GET    /kpis/activities      - Metriques activites
GET    /kpis/objectives      - Objectifs
```

## Commandes

```bash
bun dev        # Developpement (port 5173)
bun build      # Build production
bun preview    # Preview build
bun lint       # Linter
```

---

# Design System Neo Domotique

## Philosophie

- **Clean & Professionnel**: Interface epuree, focus sur les donnees
- **Coherent**: Meme DA que le backoffice admin
- **Accessible**: Contrastes suffisants, tailles lisibles
- **Responsive**: Desktop-first mais adaptatif

---

## Couleurs

### Couleurs Principales

```css
:root {
  /* Brand */
  --neo-primary: #0d6efd;
  --neo-primary-hover: #0b5ed7;
  --neo-primary-light: rgba(13, 110, 253, 0.1);

  /* Sidebar */
  --neo-sidebar-bg: #1a1d21;
  --neo-sidebar-hover: #2d3339;
  --neo-sidebar-text: #adb5bd;
  --neo-sidebar-text-active: #ffffff;

  /* Backgrounds */
  --neo-bg-body: #f5f7fa;
  --neo-bg-card: #ffffff;
  --neo-bg-light: #f8f9fa;

  /* Text */
  --neo-text-primary: #212529;
  --neo-text-secondary: #6c757d;
  --neo-text-muted: #adb5bd;

  /* Borders */
  --neo-border-color: #e9ecef;
  --neo-border-light: rgba(255, 255, 255, 0.1);

  /* Status - Pipeline */
  --neo-status-prospect: #6c757d;
  --neo-status-qualifie: #0dcaf0;
  --neo-status-proposition: #0d6efd;
  --neo-status-negociation: #ffc107;
  --neo-status-gagne: #198754;
  --neo-status-perdu: #dc3545;

  /* Semantic */
  --neo-success: #198754;
  --neo-warning: #ffc107;
  --neo-danger: #dc3545;
  --neo-info: #0dcaf0;
}
```

### Utilisation des Couleurs

| Usage | Variable | Hex |
|-------|----------|-----|
| Actions principales | `--neo-primary` | #0d6efd |
| Fond de page | `--neo-bg-body` | #f5f7fa |
| Cartes | `--neo-bg-card` | #ffffff |
| Sidebar | `--neo-sidebar-bg` | #1a1d21 |
| Texte principal | `--neo-text-primary` | #212529 |
| Texte secondaire | `--neo-text-secondary` | #6c757d |
| Bordures | `--neo-border-color` | #e9ecef |

---

## Typographie

### Police

- **Famille**: System font stack (Bootstrap default)
- **Base size**: 16px (1rem)

```css
font-family: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
```

### Echelle Typographique

| Element | Taille | Poids | Usage |
|---------|--------|-------|-------|
| h1 / Page Title | 1.5rem (24px) | 600 | Titre de page |
| h2 / Card Title | 1.25rem (20px) | 600 | Titre de section |
| h3 | 1.1rem (17.6px) | 600 | Sous-section |
| Body | 1rem (16px) | 400 | Texte courant |
| Small | 0.875rem (14px) | 400 | Labels, meta |
| XSmall | 0.75rem (12px) | 400 | Badges, nav sections |

### Hierarchie

```css
.page-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--neo-text-primary);
  margin: 0;
}

.card-header {
  font-weight: 600;
  font-size: 1rem;
}

.nav-section {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--neo-text-secondary);
}
```

---

## Espacements

### Echelle (basee sur 4px)

| Token | Valeur | Usage |
|-------|--------|-------|
| `--space-1` | 4px | Micro |
| `--space-2` | 8px | Petit |
| `--space-3` | 12px | Medium-petit |
| `--space-4` | 16px | Medium |
| `--space-5` | 20px | Medium-large |
| `--space-6` | 24px | Large |
| `--space-8` | 32px | XL |

### Applications

```css
/* Content area padding */
.content-area {
  padding: 25px;
}

/* Card body */
.card-body {
  padding: 1rem 1.25rem;
}

/* Card header */
.card-header {
  padding: 15px 20px;
}

/* Gaps */
.gap-sm { gap: 8px; }
.gap-md { gap: 12px; }
.gap-lg { gap: 20px; }
```

---

## Layout

### Structure Generale

```
+------------------+--------------------------------+
|                  |          Top Bar               |
|     Sidebar      +--------------------------------+
|     (260px)      |                                |
|                  |         Content Area           |
|                  |         (padding: 25px)        |
|                  |                                |
+------------------+--------------------------------+
```

### Sidebar

```css
.sidebar {
  position: fixed;
  top: 0;
  left: 0;
  width: 260px;
  height: 100vh;
  background: var(--neo-sidebar-bg);
  z-index: 1000;
  overflow-y: auto;
}
```

### Main Content

```css
.main-content {
  margin-left: 260px;
  min-height: 100vh;
  background: var(--neo-bg-body);
}

.top-bar {
  background: var(--neo-bg-card);
  padding: 15px 25px;
  border-bottom: 1px solid var(--neo-border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
}
```

---

## Composants

### Cards

```css
.card {
  background: var(--neo-bg-card);
  border: none;
  border-radius: 10px;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.05);
}

.card-header {
  background: var(--neo-bg-card);
  border-bottom: 1px solid var(--neo-border-color);
  padding: 15px 20px;
  font-weight: 600;
}
```

### Stat Cards (KPIs)

```css
.stat-card {
  border-radius: 10px;
  padding: 20px;
  color: #fff;
}

.stat-card .stat-value {
  font-size: 2rem;
  font-weight: 700;
}

.stat-card .stat-label {
  font-size: 0.9rem;
  opacity: 0.9;
}

.stat-card .stat-icon {
  font-size: 2.5rem;
  opacity: 0.8;
}
```

### Boutons

```css
/* Primary */
.btn-primary {
  background: var(--neo-primary);
  border-color: var(--neo-primary);
}

/* Action buttons (table) */
.btn-action {
  padding: 0.25rem 0.5rem;
  font-size: 0.875rem;
}
```

### Badges / Status

```css
/* Pipeline status badges */
.badge-prospect { background: var(--neo-status-prospect); }
.badge-qualifie { background: var(--neo-status-qualifie); }
.badge-proposition { background: var(--neo-status-proposition); }
.badge-negociation { background: var(--neo-status-negociation); }
.badge-gagne { background: var(--neo-status-gagne); }
.badge-perdu { background: var(--neo-status-perdu); }
```

### Tables

```css
.table th {
  font-weight: 600;
  color: var(--neo-text-secondary);
  border-bottom-width: 1px;
}

.table-hover tbody tr:hover {
  background-color: var(--neo-bg-light);
}
```

### Navigation (Sidebar)

```css
.nav-link {
  color: var(--neo-sidebar-text);
  padding: 10px 20px;
  display: flex;
  align-items: center;
  gap: 12px;
  border-left: 3px solid transparent;
  transition: all 0.2s;
}

.nav-link:hover {
  color: var(--neo-sidebar-text-active);
  background: var(--neo-sidebar-hover);
}

.nav-link.active {
  color: var(--neo-sidebar-text-active);
  background: var(--neo-sidebar-hover);
  border-left-color: var(--neo-primary);
}

.nav-link i {
  font-size: 1.1rem;
  width: 20px;
  text-align: center;
}
```

### User Avatar

```css
.user-avatar {
  width: 35px;
  height: 35px;
  border-radius: 50%;
  background: var(--neo-primary);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 0.875rem;
}
```

### Formulaires

```css
.form-control, .form-select {
  border-radius: 6px;
  border-color: var(--neo-border-color);
}

.form-control:focus, .form-select:focus {
  border-color: var(--neo-primary);
  box-shadow: 0 0 0 0.2rem var(--neo-primary-light);
}

.form-label {
  font-weight: 500;
  color: var(--neo-text-primary);
  margin-bottom: 0.5rem;
}
```

---

## Icones

Utiliser **Bootstrap Icons** exclusivement.

### Icones Principales

| Usage | Icone |
|-------|-------|
| Dashboard | `bi-grid-1x2` |
| Pipeline | `bi-funnel` |
| Activites | `bi-calendar-event` |
| KPIs | `bi-graph-up` |
| Objectifs | `bi-bullseye` |
| Appel | `bi-telephone` |
| Email | `bi-envelope` |
| Reunion | `bi-people` |
| Visite | `bi-geo-alt` |
| Note | `bi-journal-text` |
| Tache | `bi-check-square` |
| Ajouter | `bi-plus-lg` |
| Modifier | `bi-pencil` |
| Supprimer | `bi-trash` |
| Voir | `bi-eye` |
| Recherche | `bi-search` |
| Filtrer | `bi-funnel` |
| Utilisateur | `bi-person` |
| Deconnexion | `bi-box-arrow-right` |
| Chevron | `bi-chevron-down` |

---

## Responsive

### Breakpoints (Bootstrap)

| Breakpoint | Min-width |
|------------|-----------|
| sm | 576px |
| md | 768px |
| lg | 992px |
| xl | 1200px |
| xxl | 1400px |

### Adaptations Mobile

```css
@media (max-width: 991.98px) {
  .sidebar {
    transform: translateX(-100%);
    transition: transform 0.3s;
  }

  .sidebar.open {
    transform: translateX(0);
  }

  .main-content {
    margin-left: 0;
  }
}
```

---

## Animations

### Transitions

```css
/* Standard transition */
transition: all 0.2s ease;

/* Navigation */
.nav-link {
  transition: all 0.2s;
}

/* Cards hover */
.card-hover:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
}
```

### Loading States

```css
.spinner {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
```

---

## Structure des Fichiers

```
src/
├── components/
│   ├── layout/
│   │   ├── Layout.tsx
│   │   ├── Sidebar.tsx
│   │   ├── TopBar.tsx
│   │   └── index.ts
│   ├── ui/
│   │   ├── Card.tsx
│   │   ├── StatCard.tsx
│   │   ├── Badge.tsx
│   │   ├── Button.tsx
│   │   ├── Table.tsx
│   │   ├── Pagination.tsx
│   │   ├── Modal.tsx
│   │   ├── Alert.tsx
│   │   ├── Spinner.tsx
│   │   └── index.ts
│   └── forms/
│       ├── Input.tsx
│       ├── Select.tsx
│       └── index.ts
├── pages/
│   ├── auth/
│   │   └── LoginPage.tsx
│   ├── dashboard/
│   │   └── DashboardPage.tsx
│   ├── leads/
│   │   ├── LeadsPage.tsx
│   │   ├── LeadDetailPage.tsx
│   │   └── LeadFormPage.tsx
│   ├── activities/
│   │   ├── ActivitiesPage.tsx
│   │   └── ActivityFormPage.tsx
│   └── kpis/
│       └── KPIsPage.tsx
├── services/
│   ├── api.ts
│   ├── auth.service.ts
│   ├── leads.service.ts
│   ├── activities.service.ts
│   └── kpis.service.ts
├── stores/
│   ├── auth.store.ts
│   └── ui.store.ts
├── hooks/
│   ├── useAuth.ts
│   └── useApi.ts
├── types/
│   ├── auth.types.ts
│   ├── lead.types.ts
│   ├── activity.types.ts
│   └── kpi.types.ts
├── styles/
│   ├── variables.css
│   └── global.css
├── App.tsx
├── main.tsx
└── router.tsx
```

---

## Bonnes Pratiques

### Code

1. **TypeScript strict** - Toujours typer les props et states
2. **Composants fonctionnels** - Hooks exclusivement
3. **Separation des concerns** - UI / Logic / Data
4. **Nommage explicite** - PascalCase composants, camelCase fonctions

### UI/UX

1. **Feedback immediat** - Loading states, toasts
2. **Confirmation destructive** - Modal avant suppression
3. **Messages d'erreur clairs** - En francais
4. **Accessibilite** - Labels, focus visible, contrastes

### Dark Mode (CRITIQUE)

Le CRM supporte un theme dark (`[data-theme="dark"]` sur `<html>`). **Toutes les pages DOIVENT etre lisibles en dark mode.** Regles :

1. **JAMAIS utiliser de couleurs en dur** (#ffffff, #212529, etc.) dans les composants React. Toujours utiliser les variables CSS `var(--neo-*)` qui s'adaptent au theme.
2. **JAMAIS `bg-light` ni `bg-white`** comme fond de contenu en Bootstrap - utiliser `var(--neo-bg-card)` ou la classe `.card` qui est deja overridee en dark.
3. **JAMAIS `text-dark`** pour forcer du texte sombre - le texte herite automatiquement via `var(--neo-text-primary)` en dark mode.
4. **`text-secondary`** est override en dark (`--neo-text-secondary: #8b8fa3`) - OK a utiliser pour du texte secondaire.
5. **`bg-light text-secondary` sur les badges** est ILLISIBLE en dark. Utiliser `badge border text-body-secondary` a la place.
6. **Pour les fonds de zones de contenu** (scripts, code blocks, etc.) : `style={{ background: 'var(--neo-bg-card, #ffffff)' }}` - PAS de couleur fixe.
7. **Les `<mark>` highlights** sont geres par `theme-dark.css` - ne pas surcharger inline.
8. **Tester visuellement** en dark mode avant de valider (le theme dark est actif par defaut pour ce projet).
9. Les surcharges dark mode se trouvent dans `/src/styles/theme-dark.css`. Si un composant Bootstrap n'est pas lisible en dark, ajouter la surcharge dans ce fichier.

### Performance

1. **Lazy loading** - Pages et composants lourds
2. **Memoization** - useMemo/useCallback quand necessaire
3. **Optimistic updates** - UX fluide
