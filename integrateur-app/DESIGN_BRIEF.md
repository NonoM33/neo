# Design Brief — Neo Intégrateur (iPhone + iPad)

> **Destinataires** : équipes design (UX/UI) + Claude Design
> **Produit** : application terrain Flutter pour intégrateurs domotique
> **Plateformes** : iOS 17+ — iPhone (375 → 440 pt) **et** iPad (810 → 1024 pt), portrait **et** paysage
> **Version du brief** : 1.0 — 2026-08-16
> **Sources** : code `integrateur-app/` (149 fichiers Dart), [SPECS.md](SPECS.md), [TABLET_UX_AUDIT.md](TABLET_UX_AUDIT.md), [CLAUDE.md](CLAUDE.md)

---

## 0. Comment lire ce document

Ce brief est **exhaustif par construction** : il décrit tout ce que l'app fait aujourd'hui, tout ce qu'elle devrait faire mieux, et tout ce dont un designer a besoin pour maquetter sans jamais avoir à ouvrir le code.

| Section | Utilité |
|---|---|
| §1–3 | Contexte, utilisateurs, principes → cadrent les décisions |
| §4–6 | Navigation, tokens, composants → le système |
| §7 | **Inventaire écran par écran** (le cœur du brief) |
| §8–12 | Responsive, motion, états système, a11y, contenu |
| §13–15 | Parcours prioritaires, livrables, contraintes techniques |
| Annexes | Données de référence pour des maquettes réalistes |

**Règle d'or du brief** : tout ce qui est écrit « aujourd'hui » décrit l'existant (à respecter ou à challenger explicitement) ; tout ce qui est écrit « attendu » est une demande de design.

---

## 1. Le produit en une page

Neo Intégrateur est l'outil de terrain d'un installateur domotique. Un utilisateur ouvre l'app **chez le client**, souvent debout, parfois avec des gants, dans une cave sans réseau, et doit en ressortir avec :

1. un **audit** de la maison (pièce par pièce : besoins, photos, notes, plans),
2. un **devis** chiffré à partir du catalogue produits,
3. une **signature** du client, sur place ou par email.

Le reste de l'app soutient ce cycle : agenda des rendez-vous, catalogue, support/SAV, et pilotage Home Assistant des installations livrées.

**La promesse produit** : *arriver chez le client les mains vides et repartir avec un devis signé.*

Tout choix de design doit servir cette phrase.

---

## 2. Utilisateurs & contextes d'usage

### 2.1 Trois rôles (enum `UserRole`)

| Rôle | Ce qu'il fait | Device dominant |
|---|---|---|
| **Intégrateur** | Audit + devis + installation + SAV. C'est l'utilisateur principal. | iPad (terrain), iPhone (déplacement) |
| **Auditeur** | Audit technique uniquement, sans chiffrage | iPad |
| **Admin** | Tout + supervision, catalogue, tickets | iPad / desktop-like (iPad Pro paysage) |

Aujourd'hui **aucune différenciation visuelle par rôle** dans l'UI. → **Attendu** : proposer une stratégie (masquage vs désactivation vs états read-only explicites).

### 2.2 Contextes physiques réels — contraintes de design non négociables

| Contexte | Conséquence design |
|---|---|
| Debout, iPad tenu à une main, l'autre main saisit | Actions primaires **atteignables au pouce**, jamais uniquement en haut d'écran |
| Plein soleil / véranda | Contrastes forts, pas de texte gris clair sur fond clair, pas de badge `alpha(20)` |
| Cave, vide sanitaire, chantier sans 4G | **Offline-first visible** : tout état de synchro doit être lisible d'un coup d'œil |
| Gants de chantier, doigts sales | Cibles ≥ 48 dp, idéalement **56 dp**, espacement ≥ 8 dp |
| Client qui regarde par-dessus l'épaule | Écrans « présentables » : devis, plan, signature doivent être **montrables au client** |
| Signature client sur l'iPad qu'on lui tend | Un mode **« passage au client »** : plein écran, sans navigation, sans données internes (marges, prix d'achat) |
| iPhone en poche entre deux RDV | Consultation rapide : agenda du jour, itinéraire, appeler le client, statut d'un devis |

### 2.3 Répartition attendue des usages

- **iPad** = production (audit, plan, devis, signature). ~80 % du temps métier.
- **iPhone** = consultation + capture (photos, scan LiDAR de pièce, agenda, appel client, ticket rapide). Doit être **complet mais pas identique**.

> ⚠️ Aujourd'hui l'app est conçue « tablette d'abord » et l'iPhone reçoit un layout dégradé automatique (breakpoint < 600). **C'est le principal chantier de ce brief.**

---

## 3. Principes directeurs (à appliquer partout)

1. **Une tâche = un écran plein.** Sur le terrain on ne navigue pas, on avance.
2. **Le pouce d'abord.** Toute action répétée (cocher, +/-, photo suivante) est à portée de pouce, sur les deux plateformes.
3. **Offline est un état normal, pas une erreur.** Jamais de message anxiogène ; un badge, une file d'attente, une reprise silencieuse.
4. **Le contenu du client passe avant le chrome.** Photos, plans, devis en grand ; les barres, rails et filtres s'effacent.
5. **iPad ≠ grand iPhone.** Le gain d'espace sert à **supprimer des allers-retours** (maître-détail, panneaux, édition inline), pas à étirer des listes.
6. **iPhone ≠ iPad amputé.** On réorganise (bottom sheets, wizard, focus mode), on ne coupe pas une fonctionnalité métier.
7. **Toujours montrer l'avancement.** Audit, checklist, audit technique, devis : un pourcentage ou une progression visible en permanence.
8. **Zéro perte de données.** Toute saisie survit à un back, un crash, une perte réseau, une rotation.
9. **Lisible à bout de bras.** Corps de texte minimum **14 pt** (aujourd'hui 11–12 pt à plusieurs endroits), badges ≥ 12 pt.
10. **Le client ne voit jamais l'interne.** Prix d'achat, marge, notes internes, SLA, diagnostic IA : invisibles en mode présentation.

---

## 4. Architecture de navigation

### 4.1 Carte des routes (existant, GoRouter)

```
/login                                   (hors shell, plein écran)
│
└── SHELL (rail iPad / bottom bar iPhone)
    ├── /                                Tableau de bord
    ├── /projects                        Liste projets
    │   ├── /projects/new                Formulaire création      (plein écran)
    │   └── /projects/:id                Détail projet
    │       ├── /edit                    Formulaire édition       (plein écran)
    │       ├── /audit                   Audit terrain            (IMMERSIF, sans nav)
    │       ├── /rooms/:roomId/plan      Plan de pièce            (IMMERSIF, sans nav)
    │       └── /quote                   Devis du projet
    ├── /calendar                        Agenda
    │   ├── /calendar/new                Nouveau RDV              (plein écran)
    │   └── /calendar/:id                Détail RDV
    │       └── /audit                   Audit technique (12 sections)
    ├── /availability                    Mes disponibilités       (non exposé dans la nav)
    ├── /catalogue                       Catalogue produits
    │   └── /catalogue/:id               Fiche produit
    ├── /homes                           Ma Maison (Home Assistant)
    └── /tickets                         Support
        ├── /tickets/new                 Nouveau ticket           (plein écran)
        └── /tickets/:id                 Détail ticket

/quotes/:id/preview                      Aperçu PDF devis (fullscreenDialog, hors shell)
```

### 4.2 Navigation actuelle et ses problèmes

| | iPad (≥ 600 pt) | iPhone (< 600 pt) |
|---|---|---|
| Conteneur | `NavigationRail` (étendu ≥ 1200 pt) | `NavigationBar` bas |
| Entrées | 6 : Tableau de bord · Projets · Agenda · Catalogue · Maison · Support | Les mêmes 6, labels raccourcis |
| Actions secondaires | Sync + compte en bas du rail | **Nulle part** |
| Écrans immersifs | Audit et Plan masquent la nav | Idem |

**Problèmes identifiés :**
- **6 onglets en bottom bar sur iPhone** : au-delà de 5, les labels se compressent et les cibles tombent sous le confort. → **Attendu** : proposition à 4–5 entrées + regroupement (ex. « Plus » ou fusion Maison/Support), argumentée.
- **Sync et compte inaccessibles sur iPhone** : le bouton de synchro (avec son badge « éléments en attente ») et le menu compte n'existent que dans le rail iPad. → **Attendu** : emplacement mobile pour l'état de synchro (persistant, pas caché dans un menu) et pour le compte.
- **Aucun fil d'Ariane** dans les profondeurs (`Projet > Audit > Pièce > Plan`). → **Attendu** : pattern de retour contextuel explicite (« Retour au projet » existe déjà par endroits, à systématiser).
- **`/availability` n'est atteignable par aucun point d'entrée visible.** → À rattacher (profil ? agenda ?).
- **Pas d'écran Profil** : le menu propose « Mon profil » mais rien n'est branché. → **Attendu** : maquetter l'écran manquant (§7.14).

### 4.3 Ce qu'on attend sur la navigation

1. Une **proposition iPhone** complète : tab bar, accès sync, accès compte, gestion de la profondeur (push vs sheet).
2. Une **proposition iPad** : rail compact (≥ 600) vs rail étendu (≥ 1200) vs *sidebar permanente* type Files/Mail — quel seuil, quel contenu (le rail peut-il afficher les projets récents ?).
3. Le traitement des **écrans immersifs** : quelle sortie, quel bouton, quel geste (swipe-back ?), et comment ne jamais piéger l'utilisateur.
4. Le comportement en **Split View / Slide Over / Stage Manager** iPad : l'app peut se retrouver à 320 pt de large sur un iPad. Aujourd'hui elle bascule alors en layout iPhone — à valider ou corriger.

---

## 5. Design tokens actuels (base de travail)

Ces valeurs existent en code. Elles peuvent être **modifiées** mais tout changement doit être explicite dans les livrables.

### 5.1 Couleurs de marque

| Token | Hex | Usage |
|---|---|---|
| Primary | `#1565C0` | Bleu profond, actions principales |
| Secondary | `#00897B` | Teal, accents secondaires |
| Tertiary | `#F57C00` | Ambre, alertes douces / offline |
| Success | `#2E7D32` | |
| Warning | `#F9A825` | |
| Error | `#C62828` | |

### 5.2 Couleurs de statut

| Statut | Hex |
|---|---|
| Brouillon | `#7E57C2` (violet) |
| En cours | `#1E88E5` (bleu vif) |
| Terminé | `#43A047` (vert) |
| Archivé | `#78909C` (bleu-gris) |
| Audit | `#8E24AA` |
| Devis envoyé | `#039BE5` |
| Signé | `#2E7D32` |

**Types de RDV** (couleurs venant du back-office, à harmoniser avec la palette ci-dessus) : Visite technique `#0d6efd` · Audit `#6f42c1` · RDV commercial `#198754` · Installation `#fd7e14` · SAV `#dc3545` · Réunion interne `#6c757d` · Autre `#adb5bd`.
→ **Attendu** : réconcilier ces deux systèmes de couleurs (aujourd'hui incohérents) en une seule échelle sémantique.

### 5.3 Dark mode — surfaces teintées bleu (jamais gris neutre)

| Niveau | Hex | Usage |
|---|---|---|
| Base | `#0F1419` | Fond d'écran |
| Surface 1 | `#151B23` | Rail, sidebar |
| Surface 2 | `#1A2130` | Cards |
| Surface 3 | `#212939` | Éléments surélevés, dropdowns |
| Surface 4 | `#2A3344` | Dialogs |
| Surface 5 | `#333E50` | Tooltips |
| Texte | `#F0F3F6` | Jamais blanc pur |
| Texte secondaire | `#9BA4B0` | |

Le dark mode est **prioritaire** : usage en cave, en soirée, en camionnette. Il doit être maquetté **au même niveau de finition que le light**, pas en variante.

### 5.4 Typographie

- Police : **Inter** (via `google_fonts`), Material 3 `TextTheme`.
- Display : `w300`, letter-spacing négatif. Headlines : `w500–w600`, LS −0.3 à −0.5. Labels : `w600`, LS +0.1 à +0.5.
- **Minimums actuels violés** : `bodySmall` 12 pt et `labelSmall` 11 pt sont utilisés pour des informations importantes.
  → **Cible** : corps ≥ 14 pt, label/badge ≥ 12 pt, et une **échelle typographique différenciée iPhone / iPad** (aujourd'hui identique).
- **Dynamic Type** non géré. → **Attendu** : définir le comportement jusqu'à AX3 au minimum sur les écrans de lecture (devis, ticket, fiche produit).

### 5.5 Espacement, rayons, cibles

| Token | Valeur actuelle | Remarque |
|---|---|---|
| Grille de base | 8 dp | |
| Padding page | 32 dp (tablette) | **Trop large sur iPhone** → à décliner (16 dp ?) |
| Padding card | 20 dp / 24 dp large | |
| Gap cards | 16 dp · Gap sections | 32 dp |
| Rayons | xs 4 · sm 8 · md 12 · lg 16 · xl 20 · xxl 24 · full | Cards = 16, dialogs/sheets = 24 |
| Boutons | `minimumSize(120, 52)`, elevation 0, radius 12 | |
| Dialogs | min 400 / max 560 pt | Inadapté iPhone → sheets |
| Bottom sheets | max 640 pt | |
| Cible tactile | **48 dp min, 56 dp idéal** | Violé à plusieurs endroits (voir [TABLET_UX_AUDIT.md](TABLET_UX_AUDIT.md)) |

### 5.6 Style visuel actuel

- Cards **flat** : elevation 0 en light et dark, bordure subtile (`outlineVariant alpha 40` / `white alpha 15`).
- Gradients **subtils, même teinte** uniquement (stat cards, panneau de branding login). Pas de multicolore.
- Material 3 partout (l'app est Flutter/Material, **pas Cupertino**) — mais elle tourne sur iOS.
  → **Décision de design à prendre et à documenter** : rester Material 3 assumé, ou introduire des inflexions iOS (gestes de retour, sheets à détentes, haptique système, barres de navigation). Argumenter.

### 5.7 Breakpoints actuels

```
mobile        < 600      → bottom bar, layout 1 colonne
tablet     600 – 1199    → rail compact, layouts 2 colonnes
desktop     ≥ 1200       → rail étendu (220 pt), layouts 3 zones
largeDesktop ≥ 1800      → défini mais inutilisé
```

**Piège connu** : un iPad 10.2" **en portrait** fait 810 pt → il passe bien en « tablet », mais plusieurs écrans testent `≥ 900` pour leurs layouts multi-colonnes et retombent donc en rendu mobile en portrait. **À traiter explicitement dans les maquettes : portrait et paysage sont deux designs, pas un seul.**

---

## 6. Bibliothèque de composants à concevoir

Chaque composant doit être livré avec ses **états** : défaut · pressé · désactivé · chargement · erreur · focus clavier · sélection · light & dark · iPhone & iPad.

### 6.1 Navigation & structure
- Rail iPad (compact / étendu) · Bottom bar iPhone · App bar contextuelle (titre, retour, actions, overflow)
- Fil d'Ariane / bouton de retour contextuel · Tabs (Audit : Checklist / Photos / Notes / Plan)
- Sheets (iPhone : à détentes) vs Dialogs (iPad : 400–560 pt) vs Side panels (iPad paysage)

### 6.2 Données & listes
- **Card projet** (avatar client, nom, statut, adresse, progression, badge non-synchronisé) — variantes liste / grille / compacte
- **Card produit** (photo, réf, marque, prix HT/TTC, stock, protocoles, favori)
- **Ligne de devis** (type, description, pièce, quantité ±, PU, total, badge « déjà possédé »)
- **Card RDV** (type coloré, heure, durée, client, lieu, statut, participants)
- **Card ticket** (numéro, priorité, statut, client, SLA, dernière activité)
- **Card appareil Home Assistant** (icône domaine, nom, état, contrôle inline)
- **Ligne de checklist** (case, label, quantité, note, lien produit)
- **Vignette photo** (+ suppression, + légende, + plein écran)

### 6.3 Saisie
- Champ texte / nombre / sélection / date-heure · Stepper quantité (**cible 44–56 dp**)
- Search bar avec debounce 300 ms et effacement · Filtres : chips, panneau latéral iPad, sheet iPhone
- Toggle, rating 1–5 (audit technique), sélecteur de pièce, sélecteur de projet
- **Canvas de signature** (doigt + Apple Pencil), avec « Effacer » et validation
- **Canvas de plan** (murs, ouvertures, équipements, annotations, mesures)

### 6.4 Feedback & états
- Badges de statut (7 statuts projet/devis, 7 statuts ticket, 5 priorités)
- Indicateur de synchro (en ligne / hors ligne / en cours / N en attente) — **composant critique, visible partout**
- Skeletons (liste, grille, détail, plan) — remplacent les spinners centrés
- Empty states (illustration + explication de valeur + CTA) — 12 occurrences distinctes minimum
- Erreurs différenciées : **réseau** / **serveur** / **local** / **permission refusée**, chacune actionnable
- Snackbars, toasts, confirmations destructives, progression d'upload photo

### 6.5 Spécifiques métier
- **Barre de totaux devis** (sous-total HT, remise, TVA, total TTC) — sticky, très lisible, montrable au client
- **Jauge de progression d'audit** (par pièce et global)
- **Bandeau « Mode client »** (l'iPad est tendu au client)
- **Carte de dépendance produit** (« Cet équipement nécessite : … », obligatoire vs recommandé)
- **Bandeau LiDAR / scan** (états : disponible, non supporté, en cours, terminé, échec)

---

## 7. Inventaire des écrans

> Pour chaque écran : **rôle** · **contenu réel** (issu du code, donc fidèle) · **actions** · **états** · **attendu iPhone** · **attendu iPad**.

---

### 7.1 Login — `/login`

**Rôle** : entrer dans l'app, souvent dans une camionnette, parfois avec du réseau instable.

**Contenu actuel** : logo, titre « Neo Intégrateur », baseline « Gérez vos projets domotique de l'audit à la livraison », champ Email, champ Mot de passe (avec afficher/masquer), bouton « Se connecter », mention démo, et un bloc **« Connexion rapide (staging) »** avec trois raccourcis de rôle (Admin / Intégrateur / Auditeur).

**Problèmes** : `maxWidth: 400` sur iPad = ~30 % de l'écran utilisé ; logo 64 pt perdu ; aucune adaptation responsive ; pas de mot de passe oublié ; pas d'autofill/trousseau.

**Attendu**
- iPad paysage : **split-screen** (panneau de marque + illustration à gauche, formulaire à droite, largeur de formulaire 440–480 pt).
- iPad portrait : formulaire centré, logo agrandi, respiration verticale.
- iPhone : formulaire plein écran, champs remontés au-dessus du clavier, bouton d'action collé au clavier.
- États à maquetter : saisie, chargement, **identifiants invalides**, **serveur injoignable** (avec offre de travailler hors ligne si session existante), compte désactivé.
- Prévoir : Face ID / Touch ID, trousseau iOS, « Mot de passe oublié » (absent aujourd'hui), et le sort du bloc staging en production (masqué).

---

### 7.2 Tableau de bord — `/`

**Rôle** : savoir en 3 secondes ce qu'il y a à faire aujourd'hui.

**Contenu actuel** : salutation contextuelle (« Bonjour/Bonsoir »), total projets, bouton actualiser, **grille de 4 stats**, **actions rapides**, **projets récents** (grille 2 colonnes ≥ 900 pt, liste sinon), pull-to-refresh.

**Manques criants** : pas de **RDV du jour**, pas d'**état de synchro**, pas de **devis en attente de signature**, pas de **tickets urgents**, pas de notion de « prochaine action ».

**Attendu**
- Re-designer le dashboard comme un **poste de commande terrain**, pas une page de stats. Proposition attendue de hiérarchie, par exemple : *Prochain RDV → À finir (audits en cours) → En attente de signature → Alertes (SLA, sync bloquée) → Stats*.
- iPad paysage : grille 3–4 colonnes exploitant toute la largeur (aujourd'hui ~60 % d'utilisation d'écran, cible > 85 %).
- iPad portrait : 2 colonnes, cartes plus hautes.
- iPhone : flux vertical priorisé, la première carte doit être **actionnable sans scroller**.
- États : chargement (skeleton), erreur (« Recharger »), **premier lancement** (aucun projet), hors ligne (données en cache + horodatage « dernière mise à jour »).

---

### 7.3 Liste des projets — `/projects`

**Contenu actuel** : recherche, chips de filtre par statut (Tous / Brouillon / En cours / Terminé / Archivé), bascule liste ↔ grille, cards projet (avatar initiales client, nom, statut, adresse, date), FAB « Nouveau » **redondant** avec le bouton d'en-tête, 3 colonnes à ≥ 1200 pt.

**Problèmes** : ratio de card 2.4 (trop plat), avatars incohérents (48 vs 44), recherche sans debounce, double point d'entrée de création, chips sous-dimensionnées (padding 14×8).

**Attendu**
- **iPad paysage : layout maître-détail** — liste à gauche (~35 %), aperçu projet à droite. C'est le gain le plus évident de la tablette et il n'existe pas aujourd'hui.
- iPad portrait : grille 2 colonnes, cards plus riches (progression d'audit, présence d'un devis, badge sync).
- iPhone : liste dense, filtres en sheet, recherche persistante, swipe actions (archiver, appeler le client).
- Tri et filtres à définir : par date, par statut, par ville, **« mes projets » vs tous** (l'app est multi-utilisateurs).
- États : vide (aucun projet / aucun résultat de recherche — deux messages différents), chargement, erreur, hors ligne.
- Interactions attendues : appui long → menu contextuel (éditer, dupliquer, archiver, supprimer).

---

### 7.4 Détail projet — `/projects/:id`

**Rôle** : hub du projet. C'est l'écran le plus dense de l'app (2 100 lignes de code).

**Contenu actuel**
- En-tête client : avatar, nom, **Appeler**, **Email** (copie), **Itinéraire**, adresse copiable.
- Infos : adresse, surface, date de création, notes, statut (changeable).
- **Avancement du projet** avec état contextuel : « Démarrez l'audit » → « Audit en cours — reprendre » → « Audit terminé — générer le devis » → « Projet terminé — consulter le devis ».
- **Actions rapides** : Audit · Pièces · Devis · Plan · Catalogue · Signature · Audit technique · Produits & équipements · Livraison · Pose.
- Cas particulier : **projet archivé = lecture seule** avec bandeau explicite.

**Attendu**
- Hiérarchiser : aujourd'hui toutes les actions rapides ont le même poids alors que **une seule est la bonne à un instant T** (celle indiquée par l'avancement). Proposer une **action principale unique** + secondaires repliées.
- iPad paysage : 2 colonnes (identité/infos à gauche, avancement + actions à droite) ou 3 zones avec un aperçu des pièces.
- iPhone : en-tête compact collant (nom client + statut), actions en grille 2 colonnes, contact accessible au pouce.
- États : chargement, erreur, archivé (read-only), **projet non synchronisé** (badge + explication).
- Confirmation de suppression destructive à maquetter.

---

### 7.5 Formulaire projet — `/projects/new` · `/projects/:id/edit`

**Contenu actuel** : section client (nom, prénom, email, téléphone), section adresse (rue, CP, ville), section projet (nom, description, surface, notes), `maxWidth: 800`, une seule colonne, submit **uniquement dans l'app bar**.

**Problèmes** : clavier qui masque les champs, pas de confirmation avant abandon (perte de saisie), colonne unique gaspillant l'iPad paysage.

**Attendu**
- iPad paysage : **2 colonnes** (client à gauche, projet/adresse à droite) + barre d'action basse persistante.
- iPhone : sections empilées avec **progression visible** (3 sections), navigation clavier « Suivant » entre champs, bouton d'enregistrement au-dessus du clavier.
- Validation : messages d'erreur par champ, format email/téléphone/CP français, champs requis clairement marqués.
- **Confirmation d'abandon** obligatoire si le formulaire est modifié.
- Prévoir : sélection d'un client existant vs création (aujourd'hui non traité), autocomplétion d'adresse.

---

### 7.6 Audit terrain — `/projects/:id/audit` (écran IMMERSIF)

**Rôle** : le cœur du métier. C'est ici que l'intégrateur passe 45 minutes chez le client.

**Contenu actuel**
- **Sidebar des pièces** (280 pt fixe) : liste des pièces avec étage (« Sous-sol », « Étage N »), progression par pièce, ajout de pièce.
- **Panneau principal en 4 onglets** : **Checklist** · **Photos** · **Notes** · **Plan**.
- Checklist : items groupés par catégorie (Éclairage, Ouvrants, Climat, Sécurité, Énergie, Multimédia, Infrastructure, Réseau, Chauffage, Autre), filtres **Tout / À faire / Faits**, quantité par item, « Tout cocher », « Ajouter un item », « Charger le modèle » (templates par type de pièce).
- Photos : appareil photo ou galerie, grille 3 colonnes fixe, suppression, plein écran.
- Notes : texte libre par pièce (« Observations sur la pièce, points d'attention »).
- Plan : accès au plan de la pièce, « Placer sur le plan ».
- Indicateur « Sauvegardé », bouton « Générer le devis ».

**Problèmes** : sidebar trop étroite pour les noms longs, checkbox trop petites, grille photos figée, pas de réorganisation des pièces, pas de swipe entre pièces, dialogs d'ajout trop étroits.

**Attendu — c'est l'écran prioritaire du brief**
- **iPad paysage** : 3 zones (pièces ~30 % · contenu · panneau contextuel), checkbox agrandies, grille photos adaptative (4–6 colonnes), **réordonnancement des pièces par glisser-déposer**, **swipe entre pièces**.
- **iPad portrait** : pièces en bandeau horizontal ou tiroir rétractable, contenu plein écran.
- **iPhone** : repenser en **deux niveaux** — liste des pièces → pièce (avec les 4 onglets en segmented control ou tabs), navigation « pièce précédente / suivante » persistante, capture photo en un tap.
- **Mode capture rapide** à proposer : ajouter photo + note vocale + cocher, sans quitter la pièce.
- États : aucune pièce (empty state fort, avec suggestion des types de pièce), checklist vide, photo en cours d'upload, upload échoué (avec reprise), audit 100 % complété (célébration + CTA devis).
- Sortie de l'écran immersif : « Retour au projet » / « Retour aux pièces » — à clarifier visuellement.

---

### 7.7 Plan de pièce — `/projects/:id/rooms/:roomId/plan` (écran IMMERSIF)

**Rôle** : dessiner ou scanner la pièce, puis y placer les équipements.

**Contenu actuel**
- **Trois manières de créer un plan** : dessin manuel, **scan LiDAR** (iPad Pro / iPhone Pro), ou **scan délégué à un iPhone via QR code** (« Scanner avec iPhone » → session de scan, l'iPhone scanne, le plan remonte sur l'iPad).
- **Palette d'outils** : Sélection · Mur · Porte · Fenêtre · Équipement · Mesure · Note · Gomme · Annuler / Rétablir · Grille 25 cm · **Voir en 3D**.
- Types de murs, types d'ouvertures, côté d'ouverture, épaisseur, largeur/profondeur.
- **Équipements placés** : produit du catalogue, quantité, rotation, libellé, notes, **photos de référence**, statut de placement, et une question clé : **« Oui, déjà présent » / « Non, à installer »** (matériel déjà possédé par le client).
- **Dépendances produit** : « Cet équipement nécessite : … » (obligatoire / recommandé).
- Panneau de propriétés de l'élément sélectionné.
- Mesure au **télémètre laser Bluetooth** (Leica DISTO, Bosch GLM/PLR) : connexion BLE, lecture des distances.

**Attendu**
- **iPad** : canvas maximal, palette d'outils flottante repositionnable, panneau de propriétés en side panel non bloquant, gestes (pinch zoom, pan à deux doigts, rotation d'équipement), **support Apple Pencil** (tracé précis, hover, double-tap pour changer d'outil).
- **iPhone** : le mobile est surtout un **scanner** — le parcours « je scanne, ça part sur l'iPad » doit être limpide. L'édition fine reste possible mais simplifiée (outils en barre basse, propriétés en sheet).
- États à maquetter : LiDAR indisponible sur l'appareil, scan en cours, scan réussi (« Plan importé : N murs, M ouvertures »), scan échoué, session QR en attente / expirée, télémètre non connecté / connecté / mesure reçue, plan vide.
- Le passage **2D ↔ 3D** doit être maquetté.

---

### 7.8 Catalogue — `/catalogue` et fiche produit — `/catalogue/:id`

**Contenu actuel**
- Recherche, **catégories** (Éclairage, Volets, Chauffage, Sécurité, Réseau, Audio, Services), **favoris** avec compteur, synchronisation du catalogue (mode offline), grille de produits, panneau de détail latéral (400 pt fixe sur iPad).
- Fiche produit : photo, référence, marque, description, **protocoles** (Zigbee, WiFi, Z-Wave, Bluetooth, Filaire), prix HT / TTC, **stock** (en stock / stock faible < 5 / rupture), caractéristiques (alimentation, dimensions, compatibilité domotique, intérieur/extérieur), **dépendances produit** (obligatoire / recommandé), « Ajouter au devis » avec sélection de projet et quantité.

**Problèmes** : panneaux en largeurs fixes, cards trop verticales (ratio 0.75), image placeholder minuscule, « Ajouter au devis » ne dit pas **à quel projet** on ajoute.

**Attendu**
- iPad paysage : **3 zones proportionnelles** (filtres 25 % · grille 45 % · détail 30 %), avec possibilité de replier les filtres.
- iPad portrait : filtres en sheet, grille 3 colonnes, détail en plein écran ou en overlay.
- iPhone : grille 2 colonnes, filtres en sheet à détentes, fiche produit plein écran avec CTA collant.
- **Ajout au devis** : afficher explicitement le projet et le devis cibles, permettre de changer, confirmer avec un retour visuel (et un accès direct « Voir le devis »).
- **Dépendances** : ce composant est stratégique (il évite les oublis de matériel) — le mettre en valeur, pas en bas de fiche.
- États : catalogue non synchronisé, synchro en cours (avec progression), aucun résultat, produit inactif, rupture de stock, favoris vides.

---

### 7.9 Devis — `/projects/:id/quote` + aperçu `/quotes/:id/preview`

**Rôle** : construire le chiffrage devant le client. Écran **montrable**.

**Contenu actuel**
- Lignes de devis de 3 types : **Produit** (catalogue), **Main d'œuvre** (forfait ou horaire, prix/heure, heures), **Forfait / ligne personnalisée** (saisie libre).
- Par ligne : description, **pièce associée**, quantité ±, prix unitaire HT, TVA, total, marqueur **« Déjà possédé »** (avec photo de justification), suppression par swipe.
- Regroupement possible **par pièce** ou **par type**.
- Totaux : sous-total HT, **remise**, total HT, TVA, **total TTC**.
- Actions : ajouter un produit du catalogue (recherche + sheet), ajouter une ligne libre, ajouter de la main d'œuvre, **Aperçu PDF**, **Envoyer au devis au client**, **Signature électronique**.
- Statuts : Brouillon · Envoyé · Accepté · Refusé · Expiré. Validité en jours, date d'expiration, verrouillage après envoi (« Devis déjà envoyé »).

**Problèmes** : lignes en `ListTile` trop compactes, boutons quantité à 20 pt, totaux visuellement noyés, FAB isolé, bottom sheets full-width sur iPad.

**Attendu**
- **iPad paysage : 2 panneaux** — lignes éditables à gauche, **récapitulatif + totaux + actions** collants à droite. C'est la demande n°1 de l'audit UX existant.
- iPad portrait / iPhone : totaux en **barre collante basse**, toujours visibles pendant l'édition.
- **Ligne de devis** : composant custom riche (type, pièce, description, quantité en stepper 44 pt+, PU, total) et non un ListTile.
- Édition inline de la quantité et du prix, avec clavier numérique et validation.
- **Mode présentation client** : masquer marges/prix d'achat, agrandir, mode plein écran.
- États : aucun devis (CTA « Créer un devis »), devis vide, devis envoyé (verrouillé, mais consultable), expiré, accepté, refusé, erreur de génération PDF.

---

### 7.10 Signature — `/projects/:id/quote` → signature

**Deux modes existants :**

**A. Signature en direct (iPad tendu au client)** — écran `direct_signing_screen`
Résumé du devis (prestations, total HT, **TOTAL TTC**), mention des équipements **« Déjà possédé »**, **Conditions Générales de Vente** (repliables, « Lire les CGV complètes »), zone de signature (« Signez ici avec le doigt »), « Effacer », « **Valider et signer le devis** ».

**B. Signature à distance (email)** — écran `signature_screen`
Choix du mode (**En direct (iPad)** / **À distance (email)**), saisie du signataire (nom, email), envoi, suivi du statut (en attente / signé / annulé), « Actualiser le statut », « Ouvrir la page de signature », « Annuler la demande ».

**Attendu**
- Le mode direct est un **moment de vérité commercial** : c'est le seul écran que le client manipule. Il doit être **impeccable, sobre, rassurant** — typographie généreuse, aucune donnée interne, aucune navigation de l'app, sortie protégée.
- Maquetter : orientation **paysage ET portrait** de la zone de signature, support **Apple Pencil**, retour haptique à la validation, écran de **confirmation post-signature** (aujourd'hui non spécifié) avec envoi de copie au client.
- iPhone : la signature en direct sur un écran de 6" est-elle acceptable ? À trancher et à designer (sinon : rediriger vers le mode email).
- États : préparation du contrat, envoi en cours, envoyé, signé, erreur serveur, signature vide (validation impossible), perte de réseau **pendant** la signature (cas critique — que voit le client ?).

---

### 7.11 Agenda — `/calendar`, `/calendar/:id`, `/calendar/new`, `/availability`

**Contenu actuel**
- Calendrier mensuel (`table_calendar`) + liste des RDV du jour sélectionné, navigation mois précédent/suivant, « Aujourd'hui », filtre par type.
- **Types de RDV** avec durées par défaut : Visite technique (90 min) · Audit (120) · RDV commercial (60) · Installation (240) · SAV (60) · Réunion interne (60) · Autre (60).
- **Statuts** : proposé, confirmé, en cours, terminé, annulé, **no-show**.
- Détail RDV : date/heure, durée, **lieu** (types de lieu), organisateur, **participants** (rôle + réponse : accepté/refusé/en attente), notes, liens (projet, lead), **compte-rendu**, durée réelle.
- Actions : Confirmer · Démarrer · Terminer · Annuler (avec motif) · No-show · **Démarrer l'audit technique**.
- **Disponibilités** : créneaux hebdomadaires par jour (ex. 09:00–17:00), weekend, exceptions/overrides par date.

**Attendu**
- **Vue jour et vue semaine absentes** — indispensables sur iPad pour un agenda terrain. À concevoir.
- iPad paysage : calendrier à gauche, **timeline du jour** à droite, détail en 3e zone ou en sheet.
- iPhone : agenda du jour en priorité (c'est le cas d'usage mobile n°1), mois en repli, création de RDV en flux guidé.
- **Itinéraire / temps de trajet** entre deux RDV : à proposer (l'app a déjà l'adresse et un bouton Itinéraire dans le projet).
- Écran **Disponibilités** : aujourd'hui atteignable par aucune navigation → lui trouver sa place et le redesigner (grille hebdomadaire visuelle plutôt qu'une liste de créneaux).
- États : jour vide, mois chargé, conflit d'horaires, RDV en cours (bandeau persistant global ?), hors ligne.

---

### 7.12 Audit technique — `/calendar/:id/audit`

**Rôle** : questionnaire structuré rempli pendant une visite technique. **12 sections, ~60 questions.**

Sections : Arrivée & Contact · Informations logement · Tableau électrique · Réseau & Connectivité · Éclairage · Volets & Ouvrants · Chauffage & Climatisation · Sécurité · Multimédia · Extérieur · Besoins & Priorités · Synthèse.

Types de champs : **case à cocher**, **texte**, **nombre**, **sélection** (listes prédéfinies), **notation 1–5** (« Mauvais » → « Bon »). Notes libres par section. Progression en pourcentage. Navigation « Précédent / Suivant / Terminer ».

**Attendu**
- C'est un **wizard long** : la fatigue et l'abandon sont les vrais risques. Maquetter la progression, la reprise (« reprendre l'audit »), la sauvegarde continue, et un moyen de **sauter et revenir**.
- iPad paysage : **sommaire des 12 sections à gauche** (avec état de complétion) + section courante à droite. Deux sections côte à côte si pertinent.
- iPhone : une section par écran, progression collante en haut, clavier géré, champs numériques avec pavé adapté.
- Composants à soigner : rating 1–5 (grosses cibles), sélection à options courtes (chips plutôt que dropdown), champs texte avec hints (« Ex : sécurité, confort, économies… »).
- États : non démarré, en cours (avec %), terminé, section incomplète au moment de « Terminer » (que se passe-t-il ?).

---

### 7.13 Support / Tickets — `/tickets`, `/tickets/:id`, `/tickets/new`

**Contenu actuel**
- Liste avec recherche (ticket ou client), filtres (Tous / Ouverts), **stats d'en-tête** : tickets ouverts, **SLA dépassés**, **résolution moyenne**.
- **Statuts** : Nouveau · Ouvert · Attente client · Attente interne · Escaladé · Résolu · Fermé.
- **Priorités** : Basse · Normale · Haute · Urgente · Critique.
- **Sources** : Email · Téléphone · Portail · **Chat IA** · Backoffice · API.
- Détail : client, catégorie, assigné à, tags, **SLA (1ère réponse, dépassement)**, niveau d'escalade, **Diagnostic IA**, historique des changements.
- **Commentaires** : public (« Répondre au client… ») vs **interne** (« Note interne, invisible pour le client »), auteur client / agent / **IA**.

**Attendu**
- La distinction **public / interne** doit être **impossible à confondre** (c'est un risque métier réel : écrire une note interne au client). Traitement visuel fort à concevoir.
- iPad paysage : maître-détail (liste + conversation), avec panneau d'informations repliable.
- iPhone : liste → détail, zone de réponse collante avec basculement public/interne explicite au-dessus du clavier.
- **SLA** : représentation du temps restant / dépassé (compte à rebours, code couleur), sans être anxiogène.
- **Diagnostic IA** : identifier clairement ce qui vient de l'IA, avec un niveau de confiance et une action « utile / pas utile ».
- États : aucun ticket, aucun résultat, ticket fermé (lecture seule), escalade, hors ligne.

---

### 7.14 Ma Maison (Home Assistant) — `/homes`

**Rôle** : piloter une installation livrée (démonstration client, SAV, vérification post-installation).

**Contenu actuel**
- **Connexion** : URL du serveur (validation http/https), token d'authentification longue durée, état de connexion, déconnexion.
- **Domaines pilotés** : Lumières (on/off, luminosité) · Interrupteurs · Volets / Stores (ouvrir, fermer, position %) · Climatisation (température actuelle / cible, +/-) · Ventilateurs · Serrures · Alarme · Caméras · Capteurs · Détecteurs · Média · **Scènes**.
- États : En ligne · Indisponible · Actif · Détecté · Normal · Allumé / Éteint · Ouvert à N %.
- Compteurs par catégorie, « Aucun appareil détecté ».

**Attendu**
- **C'est l'écran le plus « grand public » de l'app** — il peut être montré au client. Il mérite le traitement visuel le plus soigné.
- iPad : grille de cartes par pièce/domaine, contrôles inline (slider luminosité, position volet), vue « pièce » et vue « type ».
- iPhone : contrôle à une main, favoris/raccourcis en haut, gestes rapides.
- Le **flux de connexion au serveur** (URL + token) est technique et hostile : à repenser (QR code ? découverte automatique ? assistant guidé ?).
- États : non connecté, connexion en cours, échec d'authentification, serveur injoignable, entité indisponible, aucune entité.

---

### 7.15 Compte / Profil — **écran manquant**

Aujourd'hui : un menu popup dans le rail avec « Mon profil » (**non implémenté**) et « Déconnexion ». Sur iPhone, **rien**.

**Attendu** : concevoir l'écran manquant — identité (nom, rôle, avatar), préférences (thème clair/sombre/auto, langue), **paramètres de synchronisation**, accès aux **Disponibilités**, gestion du stockage local / cache catalogue, connexion Home Assistant, aide, version de l'app, déconnexion.

---

### 7.16 Synchronisation — composant transversal

**Existant** : bouton dans le rail avec 3 états (en ligne / hors ligne / en cours) et un **badge du nombre d'éléments en attente**. Absent sur iPhone.

**Attendu**
- Un **système** de communication de la synchro, pas un bouton : indicateur global permanent + badges par entité (projet non synchronisé, photo en cours d'upload, devis local) + **écran/sheet de détail** listant ce qui est en attente, ce qui a échoué, et permettant de relancer.
- **Conflits** : que voit l'utilisateur quand le back-office et l'iPad ont modifié le même projet ? Non traité aujourd'hui — à concevoir.
- Le passage en mode hors ligne doit être **calme** : bandeau discret, aucune fonction bloquée en écriture.

---

### 7.17 Feedback / recette — overlay transversal

**Existant** (staging uniquement) : bouton flottant « Aide / Bug », formulaire (**Signaler un problème** / **Idée / amélioration**), gravité (Cosmétique / Mineur / Majeur / Bloquant), titre, description, étapes de reproduction, résultat attendu, email de suivi, et **« Mes retours »** avec statuts (Ouvert, À revoir, Corrigé, Clôturé).

**Attendu** : intégration visuelle propre (aujourd'hui overlay flottant), non intrusive, et déclinaison iPhone.

---

## 8. Règles responsive détaillées

### 8.1 Matrice des tailles à maquetter

| Device | Portrait (pt) | Paysage (pt) | Priorité |
|---|---|---|---|
| iPhone SE / mini | 375 × 667 | 667 × 375 | P1 (garde-fou basse) |
| iPhone 15/16 | 393 × 852 | 852 × 393 | **P0** |
| iPhone Pro Max | 430 × 932 | 932 × 430 | P1 |
| iPad 10.2" | 810 × 1080 | 1080 × 810 | **P0** |
| iPad Air 11" | 820 × 1180 | 1180 × 820 | P1 |
| iPad Pro 13" | 1024 × 1366 | 1366 × 1024 | **P0** |
| iPad Split View 1/3 | ~320–375 | — | P2 (ne doit pas casser) |

### 8.2 Règles de transformation

| Élément | < 600 pt (iPhone) | 600–1199 pt (iPad) | ≥ 1200 pt (iPad Pro paysage) |
|---|---|---|---|
| Navigation | Bottom bar | Rail compact | Rail étendu (220 pt) |
| Padding page | 16 pt | 24–32 pt | 32 pt |
| Listes | 1 colonne | 2 colonnes ou maître-détail | Maître-détail + 3e panneau |
| Filtres | Sheet | Sheet ou panneau | Panneau latéral permanent |
| Formulaires | 1 colonne | 2 colonnes | 2 colonnes + aperçu |
| Dialogs | Sheet à détentes | Dialog 400–560 pt | Dialog centré |
| Actions principales | Barre basse collante | En-tête + barre basse | En-tête + panneau latéral |

**Interdits** : `maxWidth` fixe < 600 sur un contenu centré ; largeurs de panneaux en pixels durs (utiliser des proportions 25/45/30) ; un même design pour portrait et paysage sur iPad.

### 8.3 Spécificités iPad à traiter explicitement

- **Clavier externe** : raccourcis (⌘N nouveau projet, ⌘F recherche, ⌘S enregistrer, ⇥ navigation, ⎋ fermer), focus ring visible.
- **Apple Pencil** : plan de pièce, signature, annotations de photos.
- **Glisser-déposer** : photo → pièce, produit → devis, réordonnancement des pièces et des lignes de devis.
- **Multitâche** : Split View avec Safari (fiche fournisseur) ou Mail. L'app doit rester utilisable à 1/2 et ne pas casser à 1/3.
- **Pointeur / trackpad** : états hover sur les cards, curseurs adaptés sur le canvas de plan.

### 8.4 Spécificités iPhone à traiter explicitement

- **Zone de pouce** : actions primaires dans le tiers bas.
- **Clavier logiciel** : jamais un champ masqué ; barre d'action au-dessus du clavier ; bouton « OK/Terminé » sur les pavés numériques.
- **Safe areas** : encoche, Dynamic Island, indicateur home.
- **Gestes** : swipe-back systématique, swipe actions sur les lignes de liste, pull-to-refresh.
- **Une main** : la création rapide (photo, note, ticket) doit être faisable sans changer de prise.

---

## 9. Motion, micro-interactions, haptique

**Existant** : transitions de route neutres (fade sur login, aucune ailleurs), pas d'animation de card, spinners centrés, haptique prévue mais inégale.

**Attendu** — définir et documenter :
- **Durées et courbes** standard (entrée, sortie, transformation) — 3 valeurs maximum.
- **Transitions d'écran** : liste → détail (shared element sur l'avatar/la photo produit), projet → audit (transition immersive assumée), ouverture du plan.
- **Micro-interactions** : cocher un item de checklist, incrémenter une quantité, ajouter au devis (feedback de confirmation), favori, upload de photo (progression → vignette), signature validée.
- **Haptique** : `lightImpact` sur les actions de sauvegarde/suppression, `selectionClick` sur les cases et sélections, retour fort à la validation d'une signature.
- **Skeletons** plutôt que spinners : définir les 5 formes de skeleton (liste, grille, détail, plan, conversation).
- **Célébrations mesurées** : audit complété, devis signé. Une seule animation forte dans toute l'app, pas dix.

---

## 10. États système & cas limites (à maquetter, pas seulement lister)

| Cas | Où ça arrive | Ce qu'on attend |
|---|---|---|
| Hors ligne | Partout | Bandeau/indicateur, écriture toujours possible, données en cache datées |
| Sync en attente | Projets, photos, devis | Badges par entité + écran de détail de la file |
| Sync en échec | Idem | Erreur actionnable, relance, jamais de perte silencieuse |
| Conflit de données | Projet modifié des deux côtés | Écran de résolution (à concevoir, inexistant) |
| Permission caméra refusée | Audit, plan, LiDAR | Explication + lien réglages |
| Permission Bluetooth refusée | Télémètre laser | Idem |
| LiDAR non supporté | Plan | Alternative claire (« Scanner avec iPhone », dessin manuel) |
| Session de scan expirée | Plan via QR | Relancer, timeout visible |
| Upload photo échoué | Audit | File d'attente + reprise |
| Devis verrouillé | Après envoi | Lecture seule explicite, chemin pour dupliquer |
| Projet archivé | Détail projet | Bandeau read-only (existe, à uniformiser) |
| Session expirée | Partout | Re-login sans perte du travail en cours |
| Token Home Assistant invalide | Ma Maison | Reconnexion guidée |
| Liste vide vs recherche vide | 12+ écrans | **Deux messages différents, jamais le même** |
| Serveur en erreur 500 | Partout | Message distinct du hors-ligne |

---

## 11. Accessibilité & conditions terrain

- **Contraste** : cible WCAG AA (4.5:1 texte, 3:1 éléments graphiques). Les badges actuels en `alpha(20–30)` sont à revoir — usage en plein soleil.
- **Cibles** : 48 dp minimum, 56 dp pour les actions principales, 8 dp d'espacement minimum. Plusieurs violations documentées dans [TABLET_UX_AUDIT.md](TABLET_UX_AUDIT.md) §1.1.
- **VoiceOver** : labels sur toutes les icônes-boutons, ordre de lecture cohérent, annonces sur les changements d'état (sync, sauvegarde).
- **Dynamic Type** : comportement à définir jusqu'à AX3 sur les écrans de lecture.
- **Daltonisme** : le statut ne doit jamais reposer sur la seule couleur (ajouter icône ou libellé) — 7 statuts projet/devis + 5 priorités + 7 statuts tickets.
- **Mode chantier** (proposition à explorer) : contraste renforcé, typo agrandie, cibles élargies, à activer en un geste.
- **Réduction de mouvement** : respecter `prefers-reduced-motion`.

---

## 12. Contenu, ton, formats

- **Langue** : français intégral pour l'utilisateur. Le code reste en anglais.
- **Ton** : direct, professionnel, jamais familier. L'utilisateur est un pro pressé.
- **Accents obligatoires** : plusieurs libellés du code sont actuellement non accentués (« Termines », « recents », « Disponibilites », « Ma Maison » sans accents, « Cameras », « Lumieres »…). **Toutes les maquettes doivent utiliser l'orthographe correcte** et le brief de correction doit être livré avec.
- **Formats** : dates `EEEE d MMMM yyyy` (fr_FR), heures `HH:mm`, montants `1 234,56 €`, mention **HT / TTC systématique** (enjeu légal), surfaces en m², distances en m/cm.
- **Numérotation** : devis `DEV-2026-001`, tickets avec numéro et niveau d'escalade.
- **Vocabulaire métier à respecter** : pièce (pas « salle »), audit, devis, intégrateur, fil pilote, ouvrant, protocole.

---

## 13. Parcours prioritaires à maquetter

Par ordre d'importance. Chaque parcours doit être livré **en iPhone ET en iPad (portrait + paysage)**.

| # | Parcours | Écrans traversés | Contrainte |
|---|---|---|---|
| **1** | **RDV → audit → devis → signature** (le parcours de vente complet) | Agenda → Détail RDV → Audit technique → Projet → Audit terrain → Devis → Signature directe | Le parcours doit tenir en une visite de 90 min |
| **2** | **Audit d'une pièce** (le geste le plus répété) | Audit → Pièce → Checklist / Photos / Notes / Plan | **≤ 3 taps** pour cocher un besoin et prendre une photo |
| **3** | **Construire un devis** | Catalogue → Produit → Ajouter au devis → Devis → Totaux → PDF | **≤ 4 taps** pour ajouter un produit (aujourd'hui 6+) |
| **4** | **Plan de pièce par scan** | Pièce → Plan → Choix de méthode → LiDAR ou QR/iPhone → Plan importé → Placer équipements | Le handoff iPad↔iPhone doit être évident |
| **5** | **Journée type sur iPhone** | Dashboard → RDV du jour → Itinéraire → Appeler client → Consulter projet | Tout au pouce, une main |
| **6** | **Traiter un ticket SAV** | Support → Ticket → Répondre (public/interne) → Changer statut / Escalader | Zéro risque de confusion public/interne |
| **7** | **Travailler hors ligne puis se resynchroniser** | Audit hors ligne → retour réseau → file de synchro → conflits | L'utilisateur doit comprendre sans explication |
| **8** | **Démonstration Ma Maison au client** | Ma Maison → connexion → pilotage par pièce | Écran présentable, esthétique soignée |

---

## 14. Livrables attendus

### Phase 1 — Fondations
1. **Audit de l'existant** commenté (captures annotées) — le document [TABLET_UX_AUDIT.md](TABLET_UX_AUDIT.md) donne déjà 60+ points, à confirmer/compléter/prioriser.
2. **Design system** : tokens (couleurs light+dark, typo iPhone/iPad, espacements, rayons, ombres, cibles), grille, iconographie.
3. **Stratégie de navigation** iPhone + iPad argumentée (§4.3).

### Phase 2 — Composants
4. **Bibliothèque de composants** (§6) avec tous les états, en light et dark, en iPhone et iPad.
5. **Patterns responsive** documentés (§8) : règles de transformation, breakpoints, comportements portrait/paysage.

### Phase 3 — Écrans
6. **Maquettes haute fidélité** des 17 écrans (§7), chacun en : iPhone portrait · iPad portrait · iPad paysage · light · dark · états (vide, chargement, erreur, hors ligne).
7. **Prototype interactif** des 8 parcours prioritaires (§13).

### Phase 4 — Passation
8. **Spécifications de motion** (§9) et **d'accessibilité** (§11).
9. **Fichier de correction des libellés** (accents, formulations, cohérence).
10. **Handoff dev** : exports, tokens exploitables en Flutter/Material 3, annotations de comportement responsive.

### Critères d'acceptation
- Aucune cible interactive < 48 dp ; actions principales ≥ 56 dp.
- Aucun texte de contenu < 14 pt ; aucun badge < 12 pt.
- Utilisation de l'écran iPad paysage > 85 % (mesurée sur les 6 écrans principaux).
- Chaque écran a ses 4 états (nominal, vide, chargement, erreur) + hors ligne quand applicable.
- Chaque écran existe en portrait **et** paysage sur iPad — pas de design unique étiré.
- Dark mode livré au même niveau de finition que le light.
- Les parcours 2 et 3 respectent leurs budgets de taps.

---

## 15. Contraintes techniques à connaître

L'app est **Flutter + Material 3**. Cela conditionne le coût d'implémentation :

**Peu coûteux** : tout ce qui est Material 3 (cards, chips, sheets, dialogs, navigation rail/bar, tabs), la couleur, la typographie Inter, les espacements, les skeletons (`shimmer` déjà installé), les grilles adaptatives, les transitions standard, l'haptique.

**Coûteux mais possible** : layouts maître-détail (refonte d'écran), glisser-déposer, animations partagées entre écrans, canvas custom (le plan existe déjà en `CustomPainter`), raccourcis clavier, Apple Pencil.

**À discuter avant de le maquetter** : composants purement iOS (barres Cupertino, sheets à détentes système), effets de flou/matériaux iOS, animations Lottie complexes, widgets iOS / Live Activities.

**Déjà disponible dans le projet** : `shimmer` (skeletons), `flutter_svg`, `cached_network_image`, `google_fonts` (Inter), `table_calendar`, `qr_flutter` + `mobile_scanner`, `pdf` + `printing`, `flutter_blue_plus` (BLE), `flutter_roomplan` (LiDAR, fork local), `web_socket_channel`.

---

## Annexe A — Référentiel de données (pour des maquettes réalistes)

**Statuts projet** : Brouillon · En cours · Terminé · Archivé
**Statuts devis** : Brouillon · Envoyé · Accepté · Refusé · Expiré
**Types de ligne de devis** : Produit · Main d'œuvre · Forfait
**Types de pièce** : Salon · Cuisine · Chambre · Salle de bain · Bureau · Garage · Extérieur · Autre
**Catégories produit** : Éclairage · Volets · Chauffage · Sécurité · Réseau · Audio · Services
**Protocoles** : Zigbee · WiFi · Z-Wave · Bluetooth · Filaire · Autre
**Catégories de checklist** : Éclairage · Ouvrants · Climat · Sécurité · Énergie · Multimédia · Infrastructure · Réseau · Chauffage · Autre
**Types de RDV** : Visite technique (90 min) · Audit (120) · RDV commercial (60) · Installation (240) · SAV (60) · Réunion interne (60) · Autre (60)
**Statuts RDV** : Proposé · Confirmé · En cours · Terminé · Annulé · No-show
**Statuts ticket** : Nouveau · Ouvert · Attente client · Attente interne · Escaladé · Résolu · Fermé
**Priorités ticket** : Basse · Normale · Haute · Urgente · Critique
**Sources ticket** : Email · Téléphone · Portail · Chat IA · Backoffice · API
**Rôles** : Admin · Intégrateur · Auditeur
**Domaines Home Assistant** : Lumières · Interrupteurs · Volets/Stores · Climatisation · Ventilateurs · Serrures · Alarme · Caméras · Capteurs · Détecteurs · Média · Scènes
**Outils du plan** : Sélection · Mur · Porte · Fenêtre · Équipement · Mesure · Note · Gomme
**Télémètres supportés** : Leica DISTO · Bosch GLM · Bosch PLR

## Annexe B — Checklist d'audit type (par pièce)

Éclairage (plafonnier connecté, spots, lampes d'appoint, bandeau LED, interrupteur connecté, variateur) · Ouvrants (volets roulants, store banne, porte de garage, portail) · Climat (thermostat, radiateur, tête thermostatique, climatisation, ventilateur, capteur température/humidité) · Sécurité (caméra intérieure/extérieure, détecteur mouvement/ouverture/fumée/inondation, sirène) · Énergie (prise connectée, compteur, délesteur) · Multimédia (TV, enceinte, hub/bridge, télécommande universelle) · Autre (besoin spécifique).

Des modèles spécifiques existent pour Cuisine, Salle de bain, Garage et Extérieur.

## Annexe C — Audit technique : 12 sections

1. Arrivée & Contact · 2. Informations logement · 3. Tableau électrique · 4. Réseau & Connectivité · 5. Éclairage · 6. Volets & Ouvrants · 7. Chauffage & Climatisation · 8. Sécurité · 9. Multimédia · 10. Extérieur · 11. Besoins & Priorités · 12. Synthèse

## Annexe D — Documents liés

- [SPECS.md](SPECS.md) — spécifications fonctionnelles MVP et modèles de données
- [TABLET_UX_AUDIT.md](TABLET_UX_AUDIT.md) — audit UX tablette existant (60+ points, priorisés P0/P1/P2) — **à lire avant de maquetter**
- [CLAUDE.md](CLAUDE.md) — design system en vigueur et règles de développement
