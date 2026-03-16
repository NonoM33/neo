# Business Plan - Société Domotique

> Document de référence - Brainstorming initial

---

## 1. Vision & Concept

### Proposition de valeur
Société de domotique clé en main pour particuliers (et entreprises à terme), basée sur une stack technique propriétaire construite sur Home Assistant.

### Différenciateurs
- **Plateforme technique propriétaire** basée sur Home Assistant (open source, flexible)
- **App tablette intégrateurs** pour audits et déploiements rapides
- **App client simplifiée** (HA Light) pour contrôle sans complexité
- **Cloud managé** = revenus récurrents + maintenance centralisée
- **Sur-mesure possible** avec ESP32 custom
- **Multi-gamme** : du budget au premium selon les besoins

---

## 2. Cible & Marché

### Cible prioritaire
- **Particuliers** (phase 1)
- Entreprises (phase 2)

### Zone géographique
- **Paris et Île-de-France** (démarrage)
- Extension nationale à terme

### Segments particuliers
| Segment | Profil | Budget moyen |
|---------|--------|--------------|
| Starter | Appart, premiers pas domotique | 500-1500€ |
| Confort | Maison, automatisation complète | 2000-5000€ |
| Premium | Grande maison, sur-mesure | 5000-15000€+ |

---

## 3. Services proposés

### Parcours client complet

```
1. AUDIT
   └── RDV sur site
   └── Prise de plans
   └── Photos des besoins
   └── Identification contraintes techniques
   └── Sélection matériel

2. PLANIFICATION
   └── Devis détaillé
   └── Scénarios proposés
   └── Planning intervention

3. INSTALLATION
   └── Électriciens partenaires (filaire)
   └── Intégrateurs internes (sans-fil + config)
   └── Mise en service

4. CONFIGURATION
   └── Paramétrage Home Assistant
   └── Création scénarios
   └── Tests complets

5. FORMATION
   └── Prise en main app client
   └── Explication des scénarios

6. MAINTENANCE (abonnement)
   └── Cloud managé
   └── Mises à jour
   └── Support
   └── Évolutions
```

---

## 4. Stack technique

### Architecture globale

```
┌─────────────────────────────────────────────────────────────┐
│                      CLOUD MANAGÉ                           │
├─────────────────────────────────────────────────────────────┤
│  • Instances Home Assistant par client                      │
│  • Base de données centralisée                              │
│  • Monitoring & alerting                                    │
│  • Backups automatiques                                     │
│  • Mises à jour centralisées                                │
└─────────────────────────────────────────────────────────────┘
         │                                    │
         ▼                                    ▼
┌─────────────────────┐          ┌─────────────────────────────┐
│   APP INTÉGRATEUR   │          │       APP CLIENT            │
│   (Flutter)         │          │       (HA Light)            │
├─────────────────────┤          ├─────────────────────────────┤
│ • Audit terrain     │          │ • Contrôle devices          │
│ • Plans & photos    │          │ • Scénarios simples         │
│ • Catalogue produits│          │ • Historique                │
│ • Devis auto        │          │ • Notifications             │
│ • Sync cloud        │          │ • PAS de config avancée     │
└─────────────────────┘          └─────────────────────────────┘
```

### Technologies choisies

| Composant | Technologie | Justification |
|-----------|-------------|---------------|
| Core domotique | Home Assistant | Open source, communauté, intégrations |
| App intégrateur | Flutter | Cross-platform, performant, UI riche |
| App client | Flutter (ou fork HA) | Cohérence, customisation |
| Site vitrine | Bun + framework JS | Performance, moderne |
| Cloud | À définir (VPS, K8s...) | Scalabilité |
| Custom devices | ESP32 + ESPHome | Flexibilité, marge |

---

## 5. Produits & Catalogue

### Catégories

```
CATALOGUE
├── Éclairage
│   ├── Ampoules connectées (Philips Hue, IKEA, etc.)
│   ├── Interrupteurs (Shelly, Sonoff, Legrand)
│   ├── Variateurs
│   └── Bandeaux LED (WLED)
│
├── Ouvrants
│   ├── Modules volets roulants (Shelly, Fibaro)
│   ├── Moteurs portail
│   └── Serrures connectées (Nuki, Yale)
│
├── Climat
│   ├── Thermostats (Nest, Tado, custom)
│   ├── Têtes thermostatiques (Tado, Netatmo)
│   ├── Capteurs température/humidité
│   └── Contrôle clim/PAC
│
├── Sécurité
│   ├── Caméras (Reolink, UniFi, Frigate)
│   ├── Détecteurs mouvement (Zigbee)
│   ├── Détecteurs ouverture (Zigbee)
│   ├── Sirènes
│   └── Alarme complète
│
├── Énergie
│   ├── Prises connectées
│   ├── Compteurs énergie (Shelly EM)
│   ├── Gestion solaire
│   └── Délestage
│
├── Multimédia
│   ├── Enceintes connectées
│   ├── TV / Chromecast
│   ├── Télécommandes universelles
│   └── Sonos / Multi-room
│
└── Custom ESP32
    ├── Cartes sur-mesure
    ├── Capteurs spécifiques
    └── Intégrations legacy
```

### Protocoles supportés
- **Zigbee** (recommandé : fiable, mesh, faible conso)
- **Z-Wave** (premium, très fiable)
- **WiFi** (devices courants)
- **Bluetooth** (cas spécifiques)
- **Filaire** (KNX, Modbus pour pro)

---

## 6. Modèle économique

### Sources de revenus

#### Revenus ponctuels
| Prestation | Prix indicatif |
|------------|----------------|
| Audit (déductible si signature) | 99-149€ |
| Matériel | Prix catalogue + marge 20-40% |
| Installation/pose | Tarif horaire ou forfait |
| Configuration | Inclus ou forfait |
| Formation client | Inclus |

#### Revenus récurrents (abonnements)

| Formule | Devices max | Prix/mois | Inclus |
|---------|-------------|-----------|--------|
| **Essentiel** | 20 | 9,90€ | Cloud + App + MAJ |
| **Confort** | 50 | 19,90€ | + Support prioritaire |
| **Premium** | Illimité | 34,90€ | + Monitoring 24/7 + Intervention |

### Projections revenus récurrents
- 100 clients Essentiel = 990€/mois
- 100 clients Confort = 1 990€/mois
- 50 clients Premium = 1 745€/mois
- **Total exemple** = 4 725€/mois récurrent

---

## 7. Concurrence

### Analyse concurrentielle

| Concurrent | Forces | Faiblesses | Notre avantage |
|------------|--------|------------|----------------|
| Leroy Merlin | Notoriété, prix | Service basique, pas de suivi | Service premium, expertise |
| Installateurs KNX | Fiabilité, pro | Prix élevés, complexe | Accessible, flexible |
| Intégrateurs locaux | Proximité | Artisanal, pas de stack | Outils pro, scalable |
| DIY (HA seul) | Gratuit | Complexe, pas de support | Clé en main, simplifié |
| Somfy Pro | Marque connue | Écosystème fermé | Open, multi-marques |

### Notre positionnement
**"L'expertise Home Assistant, sans la complexité"**
- Plus accessible que KNX/Loxone
- Plus pro que le DIY
- Plus flexible que les écosystèmes fermés
- Suivi et maintenance inclus

---

## 8. Organisation & Équipe

### Rôles nécessaires
- **Commercial / Relation client** : RDV, devis, suivi
- **Intégrateur / Auditeur** : terrain, installation, config
- **Électricien** : partenaires externes
- **Tech / Dev** : plateforme, apps, maintenance cloud
- **Support** : SAV, assistance client

### Phase démarrage
- Équipe fondatrice polyvalente
- Électriciens partenaires
- Développement apps en interne ou prestataire

---

## 9. Roadmap

### Phase 1 - MVP (3-6 mois)
- [ ] Choix du nom de marque
- [ ] Site vitrine (capture leads)
- [ ] App intégrateur v1 (audit, catalogue, devis)
- [ ] Process d'installation défini
- [ ] Premiers clients beta
- [ ] Infrastructure cloud de base

### Phase 2 - Lancement (6-12 mois)
- [ ] App client v1
- [ ] Catalogue fournisseurs validé
- [ ] Équipe structurée
- [ ] 50 premiers clients
- [ ] Process rodé

### Phase 3 - Scale (12-24 mois)
- [ ] Extension géographique
- [ ] Offre entreprises
- [ ] Partenariats (promoteurs, architectes)
- [ ] App intégrateur v2
- [ ] Devices custom ESP32 catalogue

---

## 10. Livrables techniques MVP

### Site vitrine
- **Stack** : Bun + Framework moderne (Astro/Next/Nuxt)
- **Objectif** : Génération de leads, prise de RDV
- **Pages** : Accueil, Services, Comment ça marche, Tarifs, Contact/RDV
- **Intégrations** : Calendly ou booking custom, CRM

### App intégrateur (Flutter)
- **Fonctionnalités MVP** :
  - Authentification intégrateur
  - Création projet/client
  - Prise de plans (dessin ou import)
  - Prise de photos par pièce
  - Checklist besoins par pièce
  - Catalogue produits (recherche, filtres)
  - Sélection produits → devis auto
  - Export/sync back-office

---

## 11. Questions ouvertes

- [ ] **Nom de la société** : à définir
- [ ] **Structure juridique** : SARL, SAS ?
- [ ] **Financement initial** : fonds propres, prêt, investisseurs ?
- [ ] **Assurances** : RC Pro, décennale via partenaires ?
- [ ] **Certifications** : QualiPAC, RGE utiles ?

---

## 12. Contacts & Ressources

### Fournisseurs potentiels
- Domadoo (grossiste domotique)
- Amazon Business
- Direct fabricants (Shelly, Sonoff)
- RS Components (électronique)

### Partenaires potentiels
- Électriciens indépendants
- Architectes d'intérieur
- Promoteurs immobiliers
- Syndics de copropriété

---

*Document créé le : Mars 2026*
*Dernière mise à jour : Mars 2026*
