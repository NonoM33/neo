# Neo Backoffice — Design System

> ⚠️ **OBLIGATOIRE.** Ce document est la **source de vérité** de la direction
> artistique de l'espace staff Neo. Toute nouvelle page / tout nouveau composant
> de `crm-commercial` **DOIT** s'y conformer : tokens, échelles, patterns,
> conventions de contenu. On n'invente **aucune** couleur, aucun rayon, aucune
> ombre hors de ce qui est défini ici.
>
> Fondé sur le **Komun Design System** (warm paper, navy ink, komun blue + ochre,
> Geist) et adapté à un **outil métier dense** (CRM, gestion, support).
>
> **Implémentation vivante** dans l'app : la page `/design-system`
> (`src/pages/design-system/DesignSystemPage.tsx`) rend ce styleguide en vrai,
> et les tokens + classes sont dans `src/styles/neo-ds.css`. Les composants du
> design system sont **scopés sous `.neo-ds`** pour cohabiter avec Bootstrap sans
> collision (`.btn`, `.card`, `.pill`… n'écrasent jamais Bootstrap globalement).

---

## 0. TL;DR pour créer une page

1. Travaille **uniquement** avec les tokens `var(--*)` et les classes documentées
   ici. N'invente aucune couleur.
2. Englobe ton écran dans `<div className="neo-ds">` (active la DA warm-paper et
   les classes scopées), puis commence par un `.page-head` (titre + actions).
3. Compose avec `<Card>`, `.stat-grid`, `.tbl-wrap`, `.grid-2/3`, etc. (cf. §5).
4. Textes en **français**, sentence case, espaces fines avant `: ; ? !`, chiffres
   en `var(--font-mono)`.

---

## 1. Principes

- **Warm, pas clinique.** Le fond est `--paper` (#FBFAF7), un blanc chaud — jamais `#FFF` pur pour la page. Les ombres sont teintées navy, jamais gris froid.
- **Hiérarchie par poids + taille + couleur**, pas par décoration. Pas de bordures épaisses, pas de gros contrastes gratuits.
- **Sidebar navy chaud** (`--ink`) = ancrage « outil pro » ; contenu clair = lisibilité. C'est la signature de la coque.
- **Komun blue = action** (boutons primaires, liens, actif). **Ochre = accent chaleureux** (gamification, en-cours, mise en avant). **Vert = succès/terminé. Rouge = urgence.**
- **Motion calme.** `--ease` partout, 120–320 ms. Pas de bounce, pas de spring. Une carte se soulève de -3px au hover, c'est tout.
- **Densité équilibrée** (façon Qonto/Doctolib) : padding interne généreux (16–24px), gaps serrés entre items de liste (8–13px).
- **Chiffres en mono** : tout montant, ID, compteur, date technique utilise `var(--font-mono)` + `font-variant-numeric: tabular-nums`.

---

## 2. Tokens (définis dans `src/styles/neo-ds.css → :root`)

N'utilise **que** ces variables. Un `var()` non résolu retombe silencieusement sur le défaut navigateur.

### Surfaces
| Token | Valeur | Usage |
|---|---|---|
| `--paper` | #FBFAF7 | fond de page |
| `--paper-2` | #F4F1EA | fonds secondaires (toolbar, segments, colonnes kanban, hover doux) |
| `--card` | #FFFFFF | surface surélevée (cartes, lignes) |
| `--hover` | #F0ECE3 | hover de surface |
| `--line` | #E8E2D5 | hairline (bordures, séparateurs) |
| `--line-2` | #D9D2C2 | séparateur plus marqué, bordure de bouton ghost |

### Encre (texte)
`--ink` #14213D (primaire) · `--ink-2` #3B4A6B (secondaire) · `--ink-3` #6B7895 (méta/labels) · `--ink-4` #A0A8BA (placeholder/disabled).

### Marque
- **Komun blue** : `--komun` #2E5BFF · `--komun-press` #1F47D6 · `--komun-soft` #DCE5FF · `--komun-ink` #0E2A8C.
- **Ochre** : `--ochre` #E8A33C · `--ochre-press` #C8861E · `--ochre-soft` #FAEACB · `--ochre-ink` #6B4309.

### Sémantique
`--success` #2D8F5F / `--success-soft` #D7EDDF / `--success-ink` #1F6443 · `--warning` #D08217 / `--warning-soft` #FAEACB · `--danger` #D14444 / `--danger-soft` #F8D9D9 / `--danger-ink` #8C2222.

### Sidebar (surface navy — inks clairs)
`--sb-bg` #14213D · `--sb-bg-2` #1B2A4A (hover/actif) · `--sb-line` rgba(255,255,255,.08) · `--sb-ink` #C6CEDF · `--sb-ink-2` #8793AD · `--sb-ink-3` #5E6B89.

### Typo
- `--font-sans` : **Geist** (95% de l'UI).
- `--font-serif` : **Instrument Serif** *italic* — uniquement grands titres éditoriaux (héros parcours, pull-quotes). Jamais en UI dense.
- `--font-mono` : **JetBrains Mono** — chiffres, IDs, codes, dates techniques.
- Échelle : titres `h1` 25px, `h2` 24px, `h3` 16–18px (600), body 15px, small 13px, méta 12px. Letter-spacing titres −0.02/−0.03em.

### Espacement & rayons
Espacement 8-pt : `--s-1`4 `--s-2`8 `--s-3`12 `--s-4`16 `--s-5`20 `--s-6`24 `--s-7`32 `--s-8`40.
Rayons : `--r-xs`4 (tags) · `--r-sm`8 (boutons, inputs) · `--r-md`12 (cartes par défaut) · `--r-lg`16 (grandes cartes, XP) · `--r-xl`24 (héros) · `--r-pill`999.
**Ne jamais mélanger deux rayons sans rapport sur un même élément.** Carte 12px → bouton 8px à l'intérieur.

### Élévation (ombres warm-navy)
`--shadow-1` (cartes par défaut) · `--shadow-2` (hover, sticky) · `--shadow-3` (popovers) · `--shadow-4` (modales) · `--shadow-focus` (anneau bleu 3px au focus) · `--shadow-inset` (search, code).

### Motion
`--ease` = cubic-bezier(0.22,0.61,0.36,1). Durées 120ms (micro) / 200ms (défaut) / 320ms (transition de page). Toujours respecter `@media (prefers-reduced-motion:reduce)`.

---

## 3. Primitives (classes / composants)

- **Bouton** `.btn` + variantes `.ochre` `.success` `.ghost` `.subtle`, tailles `.sm` `.lg`. Règle : **un seul** bouton primaire par zone d'action ; les autres en `ghost`.
- **Badge de statut** `.pill` + tons `.neutral` `.info` `.ochre` `.success` `.warning` `.danger` `.dark`, `.pd` = pastille colorée. Convention : Prospect→`ochre`, Qualifié→`info`, En cours→`info`/`warning`, Gagné/Terminé/Actif→`success`, Perdu/Urgent→`danger`, Clos→`neutral`.
- **Avatar** `.avatar` + ton `.ochre` `.blue` `.green` `.ink` `.grad` (dégradé bleu, user courant). Initiales.
- **Carte** `.card` (bord + ombre + radius 12), `.card-head` (`.ch-ic` + `h3` + `.ch-act`), `.card.flush` = padding 0 (tables/listes pleine largeur).
- **Icônes** : **Lucide** (trait 2px, line caps ronds), via SVG inline ou composant. Jamais de SVG dessiné main hors Lucide. (L'app legacy Bootstrap utilise encore Bootstrap Icons hors `.neo-ds` ; en `.neo-ds`, Lucide.)

---

## 4. Coque & layout

```
.app (grid sidebar | main)
├── .sidebar  (navy)
│   ├── .sb-brand (.sb-logo + nom)
│   ├── .sb-scroll → .sb-group (.sb-group-label + .sb-item[.active])
│   └── .sb-foot (.sb-user)
└── .main
    ├── .topbar (.tb-title/.tb-crumb · .tb-spacer · .tb-search · .tb-icon)
    └── .content → .content-in (max 1320px) → <Screen/>
```

> ⚠️ La coque réelle de `crm-commercial` est encore la coque Bootstrap legacy
> (`components/layout`). La coque `.app/.sidebar/.topbar` ci-dessus est la cible
> du design system : à adopter progressivement lors des migrations de pages.

Toute page commence par :
```jsx
<div className="screen">
  <div className="page-head">
    <div className="ph-l"><h1>Titre</h1><p>Sous-titre méta.</p></div>
    <div className="page-actions"><Btn variant="ghost" icon="filter">Filtres</Btn><Btn icon="plus">Nouveau</Btn></div>
  </div>
  {/* contenu */}
</div>
```

---

## 5. Patterns (classes CSS prêtes)

| Pattern | Classes clés | Quand |
|---|---|---|
| **Cartes stats** | `.stat-grid` > `.stat` (`.st-ic`+tone, `.st-trend up/down`, `.st-val`, `.st-label`, `.st-spark`) | KPIs en tête de dashboard |
| **Table** | `.tbl-wrap` > `.tbl-toolbar` (`.seg`, `.filter-chip`) + `.tbl` (`.t-main`, `.t-sub`, `.t-mono`, `.row-flex`, `.icon-btn`) | listes (clients, produits, devis…) |
| **Kanban** | `.kanban` > `.kcol` (`.kcol-head` `.kdot`/`.kn`/`.ksum`) > `.kcol-body` > `.kcard` | pipeline, états |
| **Graphe barres** | `.bars` > `.bar-col` (`.bar`[.ochre], `.bar-lbl`, `.bar-val`) | séries temporelles |
| **Tunnel/funnel** | `.funnel` > `.funnel-row` (`.fl` + `.funnel-bar`) | conversion |
| **Timeline activité** | `.tl` > `.tl-row` (`.tl-ic`, `.tl-bd` `.tt`/`.tm`) | historique, fil |
| **Liste simple** | `.lrow` (`.lr-main` b/small, `.lr-val`) | projets récents, devis |
| **Gamification** | `.xp-card` (`.xp-bar`, `.badges-row` `.badge-chip`) · `.podium` `.pod` | profil, leaderboard |
| **Détail (2 cols)** | `.lead-grid` (1fr / 360px) · `.field-label`, `.desc-box`, `.note`, `.fin-grid`, `.hist-row` | fiches détail |
| **Stepper/parcours** | `.stepper` `.step-node`[.done/.current/.upcoming] · `.phase-prog` · `.task-row` `.task-check` | suivi de projet |
| **Empty state** | `.empty` (`.em-ic` + b + p) | listes vides |
| **Placeholder** | `.soon` `.soon-card` | page non construite |
| **Grilles** | `.grid-2`, `.grid-3`, `.chart-grid` (1.6fr/1fr) | mise en page |

---

## 6. Conventions de contenu (français)

- **Sentence case** partout (titres, boutons, libellés). Jamais Title Case.
- **Espaces fines insécables** avant `: ; ? !` et dans les milliers (« 24 800 € », « 40 % »).
- **Tutoiement** côté coéquipier/gamification (« voici ce qui se passe », « ta série »). **Vouvoiement** dans les écrans vus par le client (parcours : « Bonjour Thomas, voici où en est **votre** installation »).
- **Devise** : `24 800 €` (espace fine, € après). **Dates** : « mar. 5 juin », « 04 juin 2026 ». **Heures** : `14h00`.
- **Emoji** : très parcimonieux, jamais en UI dense. OK dans un message d'accueil chaleureux (« Bonjour, Admin 👋 », « 🔑 »).
- Vocabulaire : « lead », « devis », « pipeline », « parcours », « conseiller ». Éviter le jargon SaaS anglais.

---

## 7. À éviter

- ❌ Couleurs hors tokens, gris froids, gradients bleu-violet SaaS.
- ❌ Title Case, apostrophes droites dans le marketing, `:` collé sans espace fine.
- ❌ Instrument Serif en UI dense (réservé aux grands titres éditoriaux).
- ❌ Bordures 2px dures, rayons mélangés, ombres gris neutre.
- ❌ Bounce/spring, parallaxe dans l'outil métier (motion calme uniquement).
- ❌ Plusieurs boutons primaires côte à côte.
- ❌ SVG dessinés à la main pour les icônes — utiliser Lucide.

---

## 8. Carte des fichiers (implémentation)

| Fichier | Rôle |
|---|---|
| `DESIGN_SYSTEM.md` | **Ce document** — DA obligatoire |
| `src/styles/neo-ds.css` | **Source de vérité CSS** : tokens `:root` + classes composants/patterns, scopées sous `.neo-ds` |
| `src/pages/design-system/DesignSystemPage.tsx` | Styleguide vivant rendu à la route `/design-system` |
