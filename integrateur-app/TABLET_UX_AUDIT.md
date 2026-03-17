# Audit UI/UX Tablette - Neo Integrateur App

> Date: 2026-03-17
> Cible: iPad 10.2" a 12.9" (paysage & portrait)
> Ecrans analyses: Login, Dashboard, Projects List, Project Detail, Project Form, Audit, Quote, Catalogue

---

## RESUME EXECUTIF

L'app a de bonnes bases (Material 3, system de spacing, breakpoints responsive, NavigationRail). Cependant, **de nombreux problemes critiques** empechent une experience tablette optimale. Les principaux axes d'amelioration sont :

1. **Zones de touch trop petites** sur de nombreux elements interactifs
2. **Sous-exploitation de l'espace tablette** (formulaires etroits, layouts single-column)
3. **Dialogs trop petits** pour l'ecran tablette
4. **Manque de feedback haptique et visuel** pour les interactions touch
5. **Pas de gestion d'orientation** (portrait vs paysage)
6. **Pas de gestion du clavier logiciel** sur les ecrans avec formulaires

---

## 1. PROBLEMES CRITIQUES (Priorite P0)

### 1.1 Zones tactiles insuffisantes

| Element | Fichier | Taille actuelle | Minimum requis |
|---------|---------|----------------|----------------|
| IconButton delete photo | `audit_screen.dart:346` | 20px icon dans 48px button | OK mais placement trop proche du bord (4px) |
| Quantity +/- buttons (quote) | `quote_screen.dart:737-748` | 20px iconSize | **40x40dp minimum** |
| Status filter chips | `projects_list_screen.dart:632` | padding 14x8 | **padding 16x12 minimum** |
| Chevron navigation | `projects_list_screen.dart:453` | 20px icon | **24px minimum** |
| Category chips (catalogue mobile) | `catalogue_screen.dart:267` | FilterChip default | OK mais espacement insuffisant |
| Tab targets (audit) | `audit_screen.dart:235-239` | TabBar defaut | **hauteur 56dp minimum** |

**Regle Material Design** : toute zone interactive doit avoir **minimum 48x48dp** de zone touchable, idealement **56x56dp sur tablette**.

### 1.2 Login Screen - Inadapte tablette

**Fichier** : `login_screen.dart`

| Probleme | Ligne | Impact |
|----------|-------|--------|
| `maxWidth: 400` - formulaire trop etroit sur tablette 10"+ | L59 | Le formulaire occupe ~30% de l'ecran, enormement d'espace perdu |
| Pas de layout split-screen (branding gauche / form droite) | - | Pattern standard tablette non respecte |
| Logo 64px trop petit sur grand ecran | L72 | Pas d'impact proportionnel a la taille d'ecran |
| Aucune adaptation responsive | - | Meme rendu sur phone 5" et tablette 13" |

### 1.3 Project Form - Layout single-column gaspille

**Fichier** : `project_form_screen.dart`

| Probleme | Ligne | Impact |
|----------|-------|--------|
| `maxWidth: 800` et une seule colonne | L86 | Sur tablette paysage, le form est centre et etroit |
| Champs empiles verticalement | L134-267 | En paysage, on pourrait avoir un layout 2 colonnes |
| Bouton submit uniquement dans AppBar | L68 | Loin du dernier champ, mauvaise ergonomie |
| Pas de gestion du clavier soft | - | Le clavier cache les champs inferieurs |
| `Navigator.of(context).pop()` sans confirmation | L328 | Perte de donnees si back accidentel |

### 1.4 Dialogs trop petits pour tablette

| Dialog | Fichier | Probleme |
|--------|---------|----------|
| Add Room | `audit_screen.dart:363` | AlertDialog par defaut = largeur ~280dp, trop etroit sur tablette |
| Custom Line | `quote_screen.dart:368` | Meme probleme, champs comprimes |
| Labor | `quote_screen.dart:444` | Meme probleme |

**Tous les dialogs** doivent utiliser `constraints: BoxConstraints(maxWidth: 560)` sur tablette.

### 1.5 Bottom Sheets inadaptes

| Sheet | Fichier | Probleme |
|-------|---------|----------|
| Add Line options | `quote_screen.dart:286` | Full-width bottom sheet sur tablette = trop large |
| Product Picker | `quote_screen.dart:332` | DraggableScrollableSheet OK mais pas de mode side-panel pour tablette |

Sur tablette, les bottom sheets devraient etre remplaces par des **side panels** ou des **dialogs centers** avec largeur max.

---

## 2. PROBLEMES MAJEURS (Priorite P1)

### 2.1 Dashboard - Sous-exploitation de l'espace

**Fichier** : `dashboard_screen.dart`

| Probleme | Ligne | Correction |
|----------|-------|------------|
| Stats grid : 2 colonnes sous 800px | L182 | Sur tablette portrait (~768px), toujours 2 colonnes - devrait etre 4 avec tailles reduites |
| StatTile height fixe 100dp | L186 | Trop compact pour tablette, augmenter a 120dp |
| Quick actions : 2 boutons identiques en taille | L316-344 | "Nouveau projet" devrait etre plus prominent |
| Recent projects : simple liste | L158-167 | Sur tablette, pourrait etre un grid 2 colonnes |
| Pas de widget "dernier sync" visible | - | Info critique pour l'utilisateur terrain |

### 2.2 Projects List - Grid cards trop compresses

**Fichier** : `projects_list_screen.dart`

| Probleme | Ligne | Correction |
|----------|-------|------------|
| `childAspectRatio: 2.4` trop large/plat | L282 | Ratio 1.8-2.0 permettrait plus de contenu |
| 3 colonnes a 1200px+ trop dense | L278 | A 1200px, 3 colonnes = cartes de ~360px, OK mais contenu trop espace |
| FAB "Nouveau" redondant avec bouton header | L130 | Double point d'entree confus |
| Search bar n'a pas de debounce | L170 | Chaque caractere declenche un filtre |
| Avatar 48x48 (list) vs 44x44 (grid) inconsistant | L376/L484 | Unifier a 48x48 |

### 2.3 Audit Screen - Sidebar trop etroite

**Fichier** : `audit_screen.dart`

| Probleme | Ligne | Correction |
|----------|-------|------------|
| Sidebar fixe 280px | L107 | Trop etroit pour noms de pieces longs, utiliser 320px ou proportionnel |
| Photos grid fixe 3 colonnes | L324 | Sur tablette paysage avec panel large, 4-5 colonnes possibles |
| Pas de drag-to-reorder pour les pieces | - | Interaction attendue sur tablette |
| CheckboxListTile default sizing | L278 | Checkbox trop petite sur tablette, utiliser `Transform.scale(scale: 1.3)` |
| Pas de swipe pour naviguer entre pieces | - | Geste naturel sur tablette |

### 2.4 Quote Screen - Layout non adapte

**Fichier** : `quote_screen.dart`

| Probleme | Ligne | Correction |
|----------|-------|------------|
| ListTile pour les lignes de devis | L240 | Trop compact, utiliser un layout custom avec plus d'info visible |
| Dismissible sans feedback visuel progressif | L228 | Ajouter un seuil visuel et haptic feedback |
| Totals section en bas : shadow trop subtile | L201 | Augmenter la separation visuelle |
| FAB "Ajouter" seul en bas a droite | L111 | Sur tablette, integrer dans le header ou sidebar |
| CircleAvatar 44dp dans ListTile leading | L241 | Inconsistant avec le reste de l'app |

### 2.5 Catalogue - Panneau detail trop etroit

**Fichier** : `catalogue_screen.dart`

| Probleme | Ligne | Correction |
|----------|-------|------------|
| Detail panel fixe 400px | L112 | Devrait etre proportionnel (35-40% de l'ecran) |
| Filters sidebar fixe 280px | L99 | Meme probleme, utiliser des proportions |
| Product card aspect ratio 0.75 | L343 | Trop vertical, 0.85 serait plus equilibre |
| Image placeholder 48px icon | L376 | Trop petit dans le contexte d'une carte produit |
| Bouton "Ajouter au devis" sans context | L530 | Ne dit pas a quel projet/devis on ajoute |

---

## 3. PROBLEMES MINEURS (Priorite P2)

### 3.1 Typographie

| Probleme | Correction |
|----------|------------|
| `bodySmall` (12px) utilise pour des infos importantes (subtitles) | Minimum 13-14px sur tablette pour lisibilite |
| `labelSmall` (11px) pour les status badges | Minimum 12px |
| Pas de scaling typographique selon taille ecran | Implementer un facteur multiplicateur pour tablette |
| Accents manquants dans le texte ("apres-midi", "Termines", "recents") | Corriger l'orthographe |

### 3.2 Couleurs et contraste

| Probleme | Fichier | Correction |
|----------|---------|------------|
| `withAlpha(20-30)` sur les status badges | Multiples | Contraste potentiellement insuffisant en plein soleil (usage terrain) |
| `Colors.orange` hardcode pour offline | `shell_scaffold.dart:128` | Utiliser le systeme de couleurs semantiques |
| `Colors.red` hardcode pour delete/logout | Multiples | Utiliser `colorScheme.error` |
| `Colors.green` hardcode pour discount | `quote_screen.dart:276` | Utiliser `colorScheme` ou couleurs semantiques |

### 3.3 Animations et transitions

| Probleme | Correction |
|----------|------------|
| Aucune animation de transition entre ecrans | Ajouter des transitions adaptees tablette (shared element, fade) |
| Pas d'animation sur les cards au tap | Ajouter un subtle scale/elevation animation |
| Loading states sans skeleton screens | Remplacer `CircularProgressIndicator` isole par des shimmer/skeleton |
| Pas de micro-interactions (like pour favoris, check pour checklist) | Ajouter des animations Lottie ou AnimatedIcon |

### 3.4 Navigation

| Probleme | Fichier | Correction |
|----------|---------|------------|
| NavigationRail leading padding 16px | `shell_scaffold.dart:47` | Augmenter a 24px pour meilleure respiration |
| Pas de breadcrumb dans les sous-pages | - | Ajouter un fil d'ariane pour les ecrans profonds (Project > Audit > Piece) |
| Back button standard trop petit | Multiples | Augmenter la zone touchable du bouton retour |
| Pas de raccourcis clavier | - | Pour les tablettes avec clavier bluetooth |

---

## 4. PROBLEMES D'ARCHITECTURE UX

### 4.1 Gestion de l'orientation

**AUCUNE gestion portrait/paysage specifique** n'existe dans l'app.

- `main.dart` autorise les deux orientations mais aucun ecran ne s'adapte
- Sur tablette en portrait (768x1024), le breakpoint `>= 900` n'est pas atteint -> l'app affiche le layout mobile
- Sur tablette en paysage (1024x768), le layout tablette s'affiche mais n'est pas optimise

### 4.2 Gestion du clavier logiciel

- Aucun `ScrollController` pour scroller au champ actif
- Pas de `resizeToAvoidBottomInset` explicite
- Les formulaires en bas d'ecran sont caches par le clavier
- Pas de bouton "Done" custom pour fermer le clavier sur iPad

### 4.3 Gestion de l'etat vide (Empty States)

Les empty states sont minimalistes et ne guident pas assez l'utilisateur :
- Icone + texte + bouton, mais pas d'illustration
- Pas d'explication de la valeur ajoutee de l'action
- Pas d'animation pour rendre l'etat vide plus engageant

### 4.4 Error Handling UX

- Les erreurs sont affichees comme simple texte centre
- Pas de distinction entre erreur reseau / erreur serveur / erreur locale
- Le message d'erreur n'est pas actionnable (juste "Reessayer")
- Pas de mode offline graceful degradation

### 4.5 Accessibilite

- Pas de `Semantics` widgets explicites
- Pas de labels d'accessibilite sur les IconButton
- Certains `tooltip` manquent
- Pas de support VoiceOver/TalkBack teste
- Contraste des textes en alpha < 50% potentiellement insuffisant

---

## 5. INVENTAIRE DES CORRECTIONS PAR FICHIER

### shell_scaffold.dart
- [ ] NavigationRail : augmenter `minWidth` non-extended de 72 a 80dp
- [ ] Logo container : augmenter a 40px icon, 12px padding
- [ ] Trailing actions : augmenter espacement entre sync et profile (16dp)
- [ ] Ajouter indicateur visuel du nombre de syncs en attente (badge)
- [ ] En portrait tablette, afficher la NavigationRail compacte (pas le BottomBar)

### login_screen.dart
- [ ] Layout split-screen sur tablette : illustration gauche + form droite
- [ ] Augmenter maxWidth a 480px ou adapter responsive
- [ ] Logo 80px sur tablette
- [ ] Ajouter animation d'entree
- [ ] Gerer l'auto-fill pour email/password

### dashboard_screen.dart
- [ ] Stats grid : toujours 4 colonnes sur tablette (adapter la taille)
- [ ] Stat tiles : hauteur responsive (120dp tablette, 100dp mobile)
- [ ] Recent projects : grid 2 colonnes sur tablette
- [ ] Ajouter section "Sync status" visible
- [ ] Ajouter pull-to-refresh indicator visible
- [ ] Quick actions : style plus differencie entre primaire et secondaire

### projects_list_screen.dart
- [ ] Grid card aspect ratio : passer a 1.8-2.0
- [ ] Uniformiser avatars a 48x48
- [ ] Ajouter debounce sur la recherche (300ms)
- [ ] Supprimer le FAB redondant (garder uniquement le bouton header)
- [ ] Status chips : augmenter padding a 16x12
- [ ] Ajouter long-press menu sur les cartes projet (editer, supprimer, archiver)

### project_detail_screen.dart
- [ ] Quick action cards : augmenter la zone tactile a 56x56 minimum
- [ ] Ajouter des animations de transition hero pour l'avatar
- [ ] Layout 2 colonnes sur tablette paysage (info gauche, actions droite)

### project_form_screen.dart
- [ ] Layout 2 colonnes sur tablette (client gauche, projet droite)
- [ ] Supprimer maxWidth constraint, utiliser proportions
- [ ] Ajouter bouton submit en bas du formulaire (en plus de l'AppBar)
- [ ] Ajouter dialog de confirmation sur back/discard
- [ ] Gestion du clavier : scroll to focused field
- [ ] Stepper ou progression visuelle pour les sections

### audit_screen.dart
- [ ] Sidebar : 320px minimum ou 30% de l'ecran
- [ ] Photos grid : colonnes dynamiques selon largeur disponible
- [ ] Checkbox : scale 1.2x sur tablette
- [ ] Dialog ajout piece : largeur 560px avec layout ameliore
- [ ] Ajouter reorder des pieces
- [ ] Ajouter swipe gesture entre pieces

### quote_screen.dart
- [ ] Remplacer ListTile par layout custom pour les lignes
- [ ] Bottom sheet "ajouter" -> side panel ou centered dialog sur tablette
- [ ] Product picker : panel lateral plutot que bottom sheet
- [ ] Quantity +/- : zones tactiles 44x44 minimum
- [ ] Totals section : separation visuelle plus forte
- [ ] Layout 2 panneaux sur tablette (lignes gauche, totaux droite)

### catalogue_screen.dart
- [ ] Sidebar et detail panel en proportions (25%/45%/30%)
- [ ] Product cards : aspect ratio 0.85, images plus grandes
- [ ] Ajouter skeleton loading pour le grid
- [ ] Ajouter animation hero sur selection produit
- [ ] Bouton "Ajouter au devis" : preciser le projet cible

### app_theme.dart
- [ ] Ajouter un multiplicateur typographique pour tablette
- [ ] Augmenter les tailles minimales des boutons a 52dp
- [ ] NavigationRail selected icon : 32px

### app_spacing.dart
- [ ] Ajouter des spacings conditionnels tablet-aware
- [ ] Ajouter pagePaddingTablet (32dp)
- [ ] Ajouter cardPaddingTablet (20dp)

---

## 6. METRIQUES CIBLES

| Metrique | Actuel | Cible |
|----------|--------|-------|
| Zone tactile minimum | 20-44dp | 48dp (56dp ideal) |
| Taille texte minimum | 11px | 13px |
| Padding page tablette | 24dp | 32dp |
| Padding cards tablette | 16dp | 20dp |
| Ratio utilisation ecran (tablette paysage) | ~60% | >85% |
| Nombre de taps pour creer un devis | 6+ | 4 max |
| Temps de chargement percu (skeleton) | Spinner central | Skeleton instantane |
