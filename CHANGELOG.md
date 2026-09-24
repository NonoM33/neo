# Changelog

> Historique des nouveautés Neo Domotique, de la plus récente à la plus ancienne.
> Une fois la première release publiée depuis le back-office, ce fichier est régénéré automatiquement.

## v0.8.0 — Configurateur 3D & guide IA Léo
_5 juin 2026_

Le configurateur passe en 3D immersive avec « Léo », un assistant IA qui conseille le client et agit directement sur son projet. Le chatbot du site devient un véritable assistant de vente capable de qualifier, créer un compte et poser un RDV.

### ✨ Nouveautes
- **Configurateur 3D multi-niveaux** — navigation entre étages empilés, builder 3D et glisser-déposer d'un équipement directement sur une pièce.
- **Guide IA Léo** — assistant embarqué à côté du wizard qui conseille, agit sur le panier et pilote les pièces et les étages ; boutons cliquables contextuels sous ses messages.
- **Gestion des pièces** — ajout/retrait, pièces sur-mesure, renommage, icône et liens, avec accès au catalogue complet d'équipements.
- **Panneau produits** — onglets par catégorie, recherche inline, liste des équipements sélectionnés par pièce, pack essentiel, pastille passerelle, undo/redo.
- **Chatbot site vitrine** — vérification d'adresse via la Base Adresse Nationale, reconnaissance client et création de compte espace client, réservation de RDV avec tarifs produits et email de confirmation, prise de relais bot/humain, indicateur de saisie bidirectionnel et correction orthographique.
- **Notification commerciale** — l'équipe est alertée sur Mattermost à l'ouverture d'une conversation et à chaque nouveau retour de recette.
- **Serveur MCP** — endpoint Streamable HTTP exposant toute l'API aux outils IA.
- **Marketing site** — bannière et pop-up promotionnels + teaser du configurateur sur la page d'accueil.
- **Notes de version automatiques** — génération du changelog et publication Mattermost depuis le back-office.
- **Mode RDV étendu** — masquage des données internes sensibles lors des rendez-vous client.

### ⬆️ Ameliorations
- **Layout compact** desktop et iPad : vue 3D et panneau produits côte à côte.
- **Feedback** : le rapporteur peut corriger son retour tant qu'il est ouvert.
- **Mattermost** : notifications envoyées via un compte bot (API REST).

### 🔧 Corrections
- Le guide IA ne renvoie plus de réponse vide lorsqu'il termine par un appel d'outil.
- Toutes les pièces offrent désormais tout le catalogue ; l'IA ne voit plus un catalogue vide.
- Chatbot : scroll fiable et bulles visiteur qui ne disparaissent plus.
- Back-office : cookie de session en `path:/` pour le temps réel staff, affichage optimiste du message staff dans la console Chat live.
- Configurateur : plus de réouverture intempestive de l'overlay pièce (click-through 3D).
- Feedback : conservation du brouillon du formulaire par page.

## v0.7.0 — Configurateur public, chatbot IA & feedback terrain
_4 juin 2026_

Lancement du parcours de configuration self-service type IKEA avec devis en temps réel, d'un assistant IA de conversion sur le site, et d'un outil de feedback terrain pour les testeurs.

### ✨ Nouveautes
- **Configurateur public** — wizard type IKEA avec devis en temps réel et code/QR de reprise ; étape 2 visuelle « maison par pièces » et cartes produits premium (marque, icônes, états).
- **Assistant IA de conversion** — chatbot intelligent (OpenRouter) sur le site vitrine.
- **Feedback terrain** — bouton de feedback multi-surfaces avec suivi et clôture des retours.
- **Newsletter & changelog admin** — campagnes email générées par IA avec suivi d'ouverture.
- **Parcours de devis gratuit** — CTA et tunnel de devis type assurance.
- **Hébergement** — séparation du domaine staff (UI) et du domaine API headless.

### 🔧 Corrections
- Centre de recette : correction des 14 retours de recette et suppression du rechargement complet de page.
- Site vitrine : widget chatbot affiché en page d'accueil, API pointée vers les hôtes `neo-domotique.fr`, indice de scroll visible et persistant.
- Feedback : widget débloqué en cross-origin (CORP) et accessible même injecté dynamiquement.
- Tickets : page détail résiliente aux catégories/assignations nulles.

## v0.6.0 — Centre de recette & CRM produits
_2 au 3 juin 2026_

Mise en place du Centre de recette pour faire tester l'application par des non-techniciens, avec création automatique de tickets, et unification de la gestion des produits.

### ✨ Nouveautes
- **Centre de recette** (back-office STG) — validation du recettage par feature, formulaire de bug guidé pour testeur non technique, export et résolution via API.
- **Tickets GitLab automatiques** — création d'un ticket depuis un retour de bug.
- **Module produits unifié** dans le CRM.
- **Thème de marque Neo** appliqué aux box au démarrage (neo-cloud).
- **Accueil v2** — refonte cinématique de la page d'accueil du site vitrine.
- **Connexion rapide STG** — boutons de connexion gated sur back-office, CRM et app intégrateur.
- **README** racine du monorepo (architecture, apps, stack, dev, déploiement).

### 🔧 Corrections
- Recette : mise à jour des cartes en place via HTMX.
- Migrations : protection de `signature_requests` contre la dérive d'ordonnancement sur base neuve.

## v0.5.0 — Signatures, commandes & CRM
_28 mai 2026_

Industrialisation du cycle de vente : signature électronique, génération de commande et facture automatiques, et pipeline CRM en kanban.

### ✨ Nouveautes
- **Signature électronique** — migration de Documenso vers DocuSeal.
- **Commandes & factures** — commande créée automatiquement sur devis signé, facture PDF envoyée par email.
- **Pipeline CRM kanban** — glisser-déposer, filtres de pipeline persistants et UX post-conversion.
- **Espace admin & suivi** — pages devis/signatures et suivi public de commande.

## v0.4.0 — Devis & tableau de bord ERP
_21 mai 2026_

Génération de devis pilotée par l'audit, envoi au client et tableau de bord ERP temps réel ; couverture de tests de l'app intégrateur.

### ✨ Nouveautes
- **Génération de devis** pilotée par l'audit + dialogue d'envoi au client.
- **Générateur de PDF** réel et envoi d'email via Resend.
- **Tableau de bord ERP** temps réel avec instantané `STATUS.md`.

### ⬆️ Ameliorations
- Suite de tests de l'app intégrateur : Blocs (Audit, FloorPlan, Projects, Quotes) et Repositories, hook pre-commit exécutant `flutter test`.
- Refactoring de `audit_screen` (helpers, sheets, dialogs).

## v0.3.0 — Cloud, plans d'étage & scan 3D
_18 mars 2026_

Passage au cloud (instances par client), améliorations des plans d'étage et signature native dans l'app, avec capture 3D des pièces.

### ✨ Nouveautes
- **Cloud Neo** — instances cloud par client, CRM cloud, page RDV, proxy Whisper, neo-cloud.
- **Signature électronique native** Flutter (sans WebView).
- **Scan 3D LiDAR** — upload des fichiers USDZ vers S3 après scan.
- **Plans d'étage** — améliorations et corrections (upload photo, drag tactile).

### 🔧 Corrections
- Migrations programmatiques exécutées au démarrage du conteneur.

## v0.2.0 — Site vitrine commercial
_16 au 17 mars 2026_

Le site vitrine devient un outil de conversion, avec prospection, prise de RDV et qualification d'appels par IA.

### ✨ Nouveautes
- **Système de RDV** type Calendly — booking public, synchronisation iCal et hub de prospection.
- **Enregistrement d'appels** + qualification IA automatique (Whisper + Claude).
- **Audit du site vitrine** — formulaire, SEO, conversion et crédibilité.
- **Sécurité & simulation de présence** mises en avant sur le site.

## v0.1.0 — Fondations
_16 mars 2026_

Premières briques du projet : business plan, site vitrine et solution white-label propriétaire.

### ✨ Nouveautes
- **Neo Domotique** — business plan, site vitrine et spécifications de l'application.
- **Solution white-label** — retrait du branding Home Assistant, Neo est une solution propriétaire.
- **Déploiement** — Dockerfile du site vitrine.
