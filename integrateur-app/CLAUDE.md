# Neo Integrateur App - Regles obligatoires

## Contexte
App Flutter pour integrateurs domotique. **Usage exclusif sur tablette** (iPad 10.2" a 12.9").
Chaque modification UI DOIT respecter les guidelines ci-dessous. Aucune exception.

## Langue
- Code (variables, classes, comments techniques) : anglais
- Textes affiches a l'utilisateur (labels, messages, tooltips) : francais

---

## DESIGN SYSTEM - Theme Moderne 2025-2026

### Police : Inter (via google_fonts)
- TOUJOURS utiliser `GoogleFonts.inter()` ou le `textTheme` du theme (qui est deja en Inter)
- JAMAIS de `TextStyle(fontFamily: ...)` inline
- JAMAIS de polices systeme par defaut

### Palette de couleurs
```
Primary:   #1565C0 (bleu profond professionnel)
Secondary: #00897B (teal riche)
Tertiary:  #F57C00 (ambre-orange accent)
Success:   #2E7D32
Warning:   #F9A825
Error:     #C62828
```

### Status projets (via AppTheme.statusXxx)
```
Brouillon: #7E57C2 (violet profond)
En cours:  #1E88E5 (bleu vif)
Termine:   #43A047 (vert riche)
Archive:   #78909C (bleu-gris)
```

### Dark mode - surfaces bleu-teintees (PAS du gris neutre)
```
Base:       #0F1419
Surface 1:  #151B23 (nav rail, sidebar)
Surface 2:  #1A2130 (cards)
Surface 3:  #212939 (elevated, dropdowns)
Surface 4:  #2A3344 (dialogs)
Surface 5:  #333E50 (tooltips)
Texte:      #F0F3F6 (pas blanc pur)
Texte sec.: #9BA4B0
```

### Typographie (deja configuree dans AppTheme)
- Display: **w300** (light) avec letter-spacing negatif
- Headlines: **w500-w600** avec letter-spacing -0.3 a -0.5
- Labels: **w600** (bold) avec letter-spacing +0.1 a +0.5
- Body min: **13px**, label min: **12px**
- Toujours utiliser les styles du `TextTheme`, jamais de fontSize hardcode

### Border Radius (via AppRadius)
```
xs:   4dp  (checkboxes, petits indicateurs)
sm:   8dp  (chips, tags, petits boutons)
md:  12dp  (boutons, inputs, snackbars)
lg:  16dp  (cards standard, containers)
xl:  20dp  (feature cards, hero sections)
xxl: 24dp  (dialogs, modals, bottom sheets)
full: pill (avatars, status dots)
```

### Cards - Style FLAT moderne
- **Elevation 0** en light ET dark (pas d'ombres lourdes)
- Bordure subtile : `colorScheme.outlineVariant.withAlpha(40)` en light, `Colors.white.withAlpha(15)` en dark
- Background : `surfaceContainerLowest` (light), surface teintee bleu (dark)
- Toujours `InkWell` avec `borderRadius` matching pour feedback tactile
- Radius : **16dp** standard

### Gradients
- Uniquement des gradients **subtils same-hue** (deux tons de la meme couleur)
- Pas de gradients multicolores ou rainbow
- Utiliser pour : stat cards dashboard, login branding panel, hero sections
- Pattern dark : du plus fonce au legerement plus clair dans la meme teinte

---

## GUIDELINES TABLETTE OBLIGATOIRES

### 1. Zones tactiles
- **MINIMUM 48x48dp** pour TOUT element interactif (bouton, icon, checkbox, chip, switch)
- **Ideal 56x56dp** pour les actions principales (CTA, navigation)
- Jamais d'IconButton avec `iconSize` < 24
- Jamais de zone cliquable sans padding suffisant
- Espacement minimum entre deux cibles tactiles : **8dp**

### 2. Spacing & Padding (via AppSpacing)
- Page padding tablette : **32dp**
- Card padding tablette : **20dp** (large: 24dp)
- Card gap (entre cards) : **16dp**
- Section gap (entre sections) : **32dp**
- Espacement entre champs formulaire : **16dp**
- TOUJOURS utiliser les constantes de `AppSpacing`

### 3. Layouts responsives
- **Breakpoints** : mobile < 600, tablet 600-1199, desktop >= 1200
- Sur tablette PORTRAIT (768px) : utiliser le layout tablette (NavigationRail), PAS le layout mobile
- Sur tablette PAYSAGE (1024px+) : utiliser les layouts multi-colonnes
- Les sidebars doivent etre proportionnelles (25-35% de l'ecran), pas en pixels fixes
- Les formulaires doivent utiliser un layout **2 colonnes** sur tablette paysage
- **Jamais de `maxWidth` < 600** sur un contenu centre
- Toujours utiliser `LayoutBuilder` pour adapter les grilles dynamiquement

### 4. Dialogs et Bottom Sheets
- Sur tablette, les dialogs doivent avoir `constraints: AppSpacing.dialogConstraints`
- Preferer les **side panels** ou **dialogs centres** aux bottom sheets full-width
- Les bottom sheets doivent avoir `constraints: AppSpacing.bottomSheetConstraints`
- Radius bottom sheet : **24dp** (top)
- Toujours le drag handle (`showDragHandle: true`)
- Padding interne : **24dp** minimum

### 5. Composants obligatoires

#### Boutons
- `minimumSize: Size(120, 52)` pour les boutons principaux
- Elevation 0 (pas d'ombres sur les boutons)
- Radius : **12dp**
- Toujours un `tooltip` sur les `IconButton`
- CTA principaux : `FilledButton`, secondaires : `OutlinedButton`

#### Listes
- `contentPadding: EdgeInsets.symmetric(horizontal: 20, vertical: 4)` (defini dans le theme)
- Pour les listes actionables, preferer des cards flat cliquables aux ListTile

#### Formulaires
- Bouton submit visible en bas du formulaire + dans l'AppBar
- Confirmation avant de quitter un formulaire modifie (`PopScope`)
- `textInputAction: TextInputAction.next` sur tous les champs sauf le dernier
- Radius inputs : **12dp**

#### Grilles
- Adapter `crossAxisCount` dynamiquement avec `LayoutBuilder`
- Calculer les colonnes : `(constraints.maxWidth / targetItemWidth).floor().clamp(min, max)`
- `childAspectRatio` entre 0.8 et 2.0

#### Empty States
- Icone >= 64dp
- Texte principal en `titleMedium` avec `fontWeight: FontWeight.w600`
- Sous-texte explicatif en `bodyMedium`
- CTA avec `FilledButton.icon`

#### Loading States
- Preferer les skeleton/shimmer (`shimmer` package disponible) aux `CircularProgressIndicator` isoles
- Le skeleton doit reproduire la structure du contenu attendu

### 6. Couleurs
- **JAMAIS** de couleurs hardcodees (`Colors.red`, `Colors.green`, `Colors.orange`, etc.)
- Toujours utiliser `colorScheme.error`, `colorScheme.primary`, `colorScheme.tertiary`, ou `AppTheme.statusXxx`
- Pour les opacites, utiliser `withAlpha()` (pas `withOpacity()`)
- Contraste minimum WCAG AA (4.5:1 pour texte, 3:1 pour elements graphiques)

### 7. Navigation
- Toujours un `tooltip` en francais sur les actions
- Le bouton retour doit avoir une zone tactile de 48x48dp minimum
- Utiliser GoRouter pour TOUTE navigation, jamais `Navigator.push` directement

### 8. Feedback utilisateur
- `HapticFeedback.lightImpact()` sur les actions importantes (save, delete, toggle)
- `HapticFeedback.selectionClick()` sur les selections (checkbox, favoris)
- Snackbars pour les confirmations d'actions
- Etats de chargement sur les boutons (`isLoading` pattern)

### 9. Performance
- Debounce de 300ms sur les champs de recherche
- Pagination ou lazy loading pour les listes > 20 items
- Utiliser `const` constructors partout ou possible
- Pas de `setState` dans les callbacks async sans `mounted` check
- Ne pas recharger les donnees si le bloc n'est pas dans l'etat initial

---

## Architecture

- State management : Flutter BLoC + Riverpod providers
- Navigation : GoRouter avec shell route
- Theme : Material 3 + Inter font via `AppTheme` (light + dark)
- Spacing : systeme 8dp grid via `AppSpacing`
- Radius : tokens via `AppRadius`
- Breakpoints : via `AppBreakpoints`
- API : REST avec `ApiClient` (Dio)
- **Swagger / reference API** : http://localhost:3000/swagger (OpenAPI JSON: http://localhost:3000/swagger/openapi.json)
- Storage local : Hive
- Sync : offline-first avec SyncBloc

## API - Points importants
- Les endpoints **liste** (GET /api/projets/{id}/pieces, GET /api/projets/{id}/devis) retournent des objets **sans sous-ressources** (pas de lines, checklistItems, photos)
- Toujours faire un appel **detail** (GET /api/pieces/{id}, GET /api/devis/{id}) pour obtenir les sous-ressources completes
- Dependances produit : GET /api/produits/{id}/dependances

## Structure des fichiers
```
lib/
  core/          # Config, theme, DI, network, utils
  data/          # Models, datasources, repositories impl
  domain/        # Entities, repositories interfaces, usecases
  presentation/  # BLoCs, screens, widgets
  routes/        # GoRouter config
```

## Packages UI cles
- `google_fonts` : Police Inter
- `shimmer` : Loading states modernes
- `flutter_svg` : Icones SVG
- `cached_network_image` : Images avec cache
