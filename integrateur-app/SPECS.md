# App Intégrateur - Spécifications MVP

> Application Flutter pour les auditeurs/intégrateurs terrain

---

## 1. Vue d'ensemble

### Objectif
Application tablette (et mobile) permettant aux intégrateurs de :
- Réaliser des audits domotique sur site
- Documenter les besoins clients (plans, photos)
- Sélectionner les produits adaptés depuis le catalogue
- Générer des devis automatiquement
- Synchroniser avec le back-office

### Stack technique
- **Framework** : Flutter 3.x
- **State management** : Riverpod ou Bloc
- **Base locale** : SQLite / Hive (mode offline)
- **API** : REST ou GraphQL vers back-office
- **Stockage fichiers** : Firebase Storage ou S3

### Plateformes cibles
- iPad (prioritaire)
- Tablettes Android
- Smartphones (version adaptée)

---

## 2. Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        APP FLUTTER                          │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │    AUTH     │  │   PROJETS   │  │     CATALOGUE       │ │
│  └─────────────┘  └─────────────┘  └─────────────────────┘ │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │    AUDIT    │  │    DEVIS    │  │       SYNC          │ │
│  └─────────────┘  └─────────────┘  └─────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│                    LOCAL DATABASE                           │
│              (SQLite/Hive - Mode offline)                   │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                      BACK-OFFICE API                        │
├─────────────────────────────────────────────────────────────┤
│  • Authentification                                         │
│  • Catalogue produits                                       │
│  • Gestion clients/projets                                  │
│  • Stockage médias                                          │
│  • Génération PDF devis                                     │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Modules fonctionnels

### 3.1 Authentification

| Fonctionnalité | Description | Priorité |
|----------------|-------------|----------|
| Login | Email + mot de passe | MVP |
| Session persistante | Rester connecté | MVP |
| Rôles | Admin, Intégrateur, Auditeur | MVP |
| Logout | Déconnexion sécurisée | MVP |
| Reset password | Via email | Post-MVP |

### 3.2 Gestion des projets

| Fonctionnalité | Description | Priorité |
|----------------|-------------|----------|
| Liste projets | Voir tous les projets assignés | MVP |
| Créer projet | Nouveau client/audit | MVP |
| Fiche client | Nom, adresse, contact, notes | MVP |
| Statuts | Audit, En cours, Devis envoyé, Signé, Terminé | MVP |
| Recherche/filtres | Par nom, statut, date | MVP |
| Historique | Timeline des actions | Post-MVP |

#### Structure données Projet
```json
{
  "id": "uuid",
  "client": {
    "nom": "string",
    "prenom": "string",
    "email": "string",
    "telephone": "string",
    "adresse": {
      "rue": "string",
      "code_postal": "string",
      "ville": "string"
    }
  },
  "type_logement": "appartement | maison | autre",
  "surface_m2": "number",
  "statut": "audit | en_cours | devis_envoye | signe | termine",
  "date_creation": "datetime",
  "date_rdv": "datetime",
  "integrateur_id": "uuid",
  "pieces": [],
  "produits_selectionnes": [],
  "devis": {},
  "notes": "string"
}
```

### 3.3 Module Audit

#### 3.3.1 Gestion des pièces

| Fonctionnalité | Description | Priorité |
|----------------|-------------|----------|
| Ajouter pièce | Nom, type, surface | MVP |
| Types prédéfinis | Salon, Chambre, Cuisine, SDB, etc. | MVP |
| Photos par pièce | Prendre/importer photos | MVP |
| Annotations photos | Marquer points d'intérêt | Post-MVP |
| Notes vocales | Dictaphone | Post-MVP |

#### 3.3.2 Plan du logement

| Fonctionnalité | Description | Priorité |
|----------------|-------------|----------|
| Import plan | Photo ou PDF du plan existant | MVP |
| Dessin simplifié | Créer plan basique (rectangles) | Post-MVP |
| Placer devices | Drag & drop icônes sur plan | Post-MVP |
| Export | PNG/PDF annoté | Post-MVP |

#### 3.3.3 Checklist besoins par pièce

```
CHECKLIST TYPE PAR PIÈCE
========================

ÉCLAIRAGE
├── [ ] Plafonnier connecté
├── [ ] Spots / Encastrés
├── [ ] Lampes d'appoint
├── [ ] Bandeau LED
├── [ ] Interrupteur connecté
└── [ ] Variateur

OUVRANTS
├── [ ] Volets roulants
├── [ ] Store banne
├── [ ] Porte de garage
└── [ ] Portail

CLIMAT
├── [ ] Thermostat
├── [ ] Radiateur électrique
├── [ ] Tête thermostatique
├── [ ] Climatisation
├── [ ] Ventilateur
└── [ ] Capteur température/humidité

SÉCURITÉ
├── [ ] Caméra intérieure
├── [ ] Caméra extérieure
├── [ ] Détecteur mouvement
├── [ ] Détecteur ouverture
├── [ ] Détecteur fumée
├── [ ] Détecteur inondation
└── [ ] Sirène

ÉNERGIE
├── [ ] Prise connectée
├── [ ] Compteur énergie
└── [ ] Délesteur

MULTIMÉDIA
├── [ ] TV connectée
├── [ ] Enceinte connectée
├── [ ] Hub/Bridge
└── [ ] Télécommande universelle

AUTRE
└── [ ] Besoin spécifique (notes)
```

### 3.4 Catalogue produits

| Fonctionnalité | Description | Priorité |
|----------------|-------------|----------|
| Recherche | Par nom, référence | MVP |
| Filtres | Catégorie, marque, protocole, prix | MVP |
| Fiche produit | Photo, specs, prix, stock | MVP |
| Ajout au devis | Sélectionner + quantité + pièce | MVP |
| Favoris | Produits fréquents de l'intégrateur | MVP |
| Suggestions | Produits compatibles/alternatifs | Post-MVP |
| Mode offline | Catalogue en cache local | MVP |

#### Structure données Produit
```json
{
  "id": "uuid",
  "reference": "string",
  "nom": "string",
  "marque": "string",
  "categorie": "eclairage | ouvrants | climat | securite | energie | multimedia | custom",
  "sous_categorie": "string",
  "description": "string",
  "protocole": ["zigbee", "wifi", "zwave", "bluetooth", "filaire"],
  "prix_achat": "number",
  "prix_vente": "number",
  "marge_pourcent": "number",
  "photo_url": "string",
  "specs": {
    "alimentation": "string",
    "dimensions": "string",
    "compatibilite_ha": "boolean",
    "indoor_outdoor": "indoor | outdoor | both"
  },
  "stock_disponible": "number",
  "actif": "boolean"
}
```

### 3.5 Générateur de devis

| Fonctionnalité | Description | Priorité |
|----------------|-------------|----------|
| Liste produits | Depuis sélection catalogue | MVP |
| Quantités | Modifier par produit | MVP |
| Prix unitaire/total | Calcul auto | MVP |
| Forfait installation | Ajouter main d'œuvre | MVP |
| Remise | Pourcentage ou montant | MVP |
| Sous-totaux | Par pièce ou catégorie | MVP |
| TVA | Calcul auto (10% ou 20%) | MVP |
| Aperçu | Prévisualisation devis | MVP |
| Export PDF | Génération document | MVP |
| Envoi email | Au client | Post-MVP |
| Signature électronique | Signer sur tablette | Post-MVP |

#### Structure devis
```json
{
  "id": "uuid",
  "projet_id": "uuid",
  "numero": "DEV-2026-001",
  "date": "datetime",
  "validite_jours": 30,
  "lignes": [
    {
      "type": "produit | main_oeuvre | forfait",
      "produit_id": "uuid | null",
      "description": "string",
      "quantite": "number",
      "prix_unitaire_ht": "number",
      "tva_pourcent": "number",
      "total_ht": "number",
      "piece": "string"
    }
  ],
  "sous_total_ht": "number",
  "remise_ht": "number",
  "total_ht": "number",
  "total_tva": "number",
  "total_ttc": "number",
  "conditions": "string",
  "statut": "brouillon | envoye | accepte | refuse",
  "signature_client": "base64 | null",
  "date_signature": "datetime | null"
}
```

### 3.6 Synchronisation

| Fonctionnalité | Description | Priorité |
|----------------|-------------|----------|
| Mode offline | Travailler sans connexion | MVP |
| Sync auto | Quand connexion disponible | MVP |
| Sync manuelle | Bouton forcer sync | MVP |
| Conflits | Gestion des conflits de données | MVP |
| Upload médias | Photos en arrière-plan | MVP |
| Indicateur | Statut sync visible | MVP |

---

## 4. UI/UX Guidelines

### Navigation principale
```
┌─────────────────────────────────────────────────────────────┐
│  [Logo]     Projets   Catalogue   Profil         [Sync 🔄] │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│                     CONTENU PRINCIPAL                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Écrans principaux

1. **Dashboard** : Stats rapides, projets récents, alertes
2. **Liste projets** : Cards avec statut, client, date
3. **Détail projet** : Tabs (Infos, Pièces, Produits, Devis)
4. **Audit pièce** : Checklist, photos, notes
5. **Catalogue** : Grille produits avec filtres sidebar
6. **Devis** : Liste éditable, totaux, actions

### Design system
- **Couleurs** : À définir selon branding
- **Typographie** : Inter ou équivalent (lisible)
- **Composants** : Material Design 3 adapté
- **Mode sombre** : Optionnel (Post-MVP)

---

## 5. Sécurité

| Aspect | Implementation |
|--------|----------------|
| Auth | JWT tokens avec refresh |
| Stockage | Chiffrement données sensibles |
| API | HTTPS uniquement |
| Session | Expiration auto, logout distant |
| Permissions | RBAC (rôles) |

---

## 6. Performance

| Critère | Objectif |
|---------|----------|
| Démarrage app | < 3 secondes |
| Chargement liste | < 1 seconde |
| Sync catalogue | < 30 secondes (complet) |
| Upload photo | Background, non bloquant |
| Mode offline | 100% fonctionnel (lecture + création) |

---

## 7. Roadmap développement

### Sprint 1 - Fondations (2 semaines)
- [ ] Setup projet Flutter
- [ ] Architecture (folders, state management)
- [ ] Écrans auth (login, logout)
- [ ] Navigation de base
- [ ] Modèles de données

### Sprint 2 - Projets (2 semaines)
- [ ] Liste des projets
- [ ] Création projet
- [ ] Fiche client
- [ ] Gestion statuts
- [ ] Stockage local

### Sprint 3 - Audit (2 semaines)
- [ ] Gestion des pièces
- [ ] Checklist besoins
- [ ] Prise de photos
- [ ] Association pièce/photos
- [ ] Notes

### Sprint 4 - Catalogue (2 semaines)
- [ ] Affichage catalogue
- [ ] Recherche et filtres
- [ ] Fiche produit
- [ ] Sélection pour devis
- [ ] Cache offline

### Sprint 5 - Devis (2 semaines)
- [ ] Récap produits sélectionnés
- [ ] Édition quantités
- [ ] Calculs auto
- [ ] Génération PDF
- [ ] Preview

### Sprint 6 - Sync & Polish (2 semaines)
- [ ] Synchronisation complète
- [ ] Gestion offline
- [ ] Tests
- [ ] Bug fixes
- [ ] Optimisations

---

## 8. API Endpoints (Draft)

```
AUTH
POST   /api/auth/login
POST   /api/auth/logout
POST   /api/auth/refresh

PROJETS
GET    /api/projets
POST   /api/projets
GET    /api/projets/:id
PUT    /api/projets/:id
DELETE /api/projets/:id

PIECES
GET    /api/projets/:id/pieces
POST   /api/projets/:id/pieces
PUT    /api/pieces/:id
DELETE /api/pieces/:id

PHOTOS
POST   /api/pieces/:id/photos
DELETE /api/photos/:id

CATALOGUE
GET    /api/produits
GET    /api/produits/:id
GET    /api/produits/categories
GET    /api/produits/marques

DEVIS
GET    /api/projets/:id/devis
POST   /api/projets/:id/devis
PUT    /api/devis/:id
GET    /api/devis/:id/pdf
POST   /api/devis/:id/envoyer

SYNC
GET    /api/sync/status
POST   /api/sync/pull
POST   /api/sync/push
```

---

## 9. Dépendances Flutter suggérées

```yaml
dependencies:
  flutter:
    sdk: flutter

  # State management
  flutter_riverpod: ^2.x

  # Navigation
  go_router: ^x.x

  # HTTP
  dio: ^5.x

  # Local storage
  hive: ^2.x
  hive_flutter: ^1.x

  # SQLite (alternative)
  sqflite: ^2.x

  # Images
  image_picker: ^1.x
  cached_network_image: ^3.x

  # PDF
  pdf: ^3.x
  printing: ^5.x

  # UI
  flutter_svg: ^2.x
  shimmer: ^3.x

  # Utils
  intl: ^0.x
  uuid: ^4.x
  connectivity_plus: ^5.x

dev_dependencies:
  flutter_test:
    sdk: flutter
  flutter_lints: ^3.x
  build_runner: ^2.x
  hive_generator: ^2.x
```

---

## 10. Structure projet Flutter

```
lib/
├── main.dart
├── app.dart
│
├── core/
│   ├── config/
│   │   ├── app_config.dart
│   │   └── theme.dart
│   ├── constants/
│   ├── errors/
│   ├── network/
│   │   ├── api_client.dart
│   │   └── api_endpoints.dart
│   └── utils/
│
├── data/
│   ├── models/
│   │   ├── projet.dart
│   │   ├── client.dart
│   │   ├── piece.dart
│   │   ├── produit.dart
│   │   └── devis.dart
│   ├── repositories/
│   │   ├── projet_repository.dart
│   │   ├── catalogue_repository.dart
│   │   └── sync_repository.dart
│   └── local/
│       ├── database.dart
│       └── cache_manager.dart
│
├── domain/
│   ├── entities/
│   └── usecases/
│
├── presentation/
│   ├── providers/
│   │   ├── auth_provider.dart
│   │   ├── projets_provider.dart
│   │   └── catalogue_provider.dart
│   ├── screens/
│   │   ├── auth/
│   │   │   └── login_screen.dart
│   │   ├── dashboard/
│   │   │   └── dashboard_screen.dart
│   │   ├── projets/
│   │   │   ├── projets_list_screen.dart
│   │   │   ├── projet_detail_screen.dart
│   │   │   └── projet_form_screen.dart
│   │   ├── audit/
│   │   │   ├── pieces_screen.dart
│   │   │   ├── piece_detail_screen.dart
│   │   │   └── checklist_screen.dart
│   │   ├── catalogue/
│   │   │   ├── catalogue_screen.dart
│   │   │   └── produit_detail_screen.dart
│   │   └── devis/
│   │       ├── devis_screen.dart
│   │       └── devis_preview_screen.dart
│   └── widgets/
│       ├── common/
│       ├── projet/
│       ├── audit/
│       ├── catalogue/
│       └── devis/
│
└── routes/
    └── app_router.dart
```

---

*Specs v1.0 - Mars 2026*
