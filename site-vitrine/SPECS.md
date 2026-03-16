# Site Vitrine - Spécifications MVP

> Site web de génération de leads et prise de RDV

---

## 1. Vue d'ensemble

### Objectif
Site vitrine moderne et performant pour :
- Présenter les services de domotique
- Générer des leads qualifiés
- Permettre la prise de RDV audit
- Établir la crédibilité de la marque

### Stack technique
- **Runtime** : Bun
- **Framework** : Astro (recommandé) ou Next.js
- **Styling** : Tailwind CSS
- **Animations** : Framer Motion (optionnel)
- **Formulaires** : React Hook Form
- **Hébergement** : Vercel / Cloudflare Pages

### Cibles
- Particuliers recherchant des solutions domotiques
- Propriétaires de maisons/appartements
- Zone : Paris et Île-de-France

---

## 2. Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      SITE VITRINE                           │
├─────────────────────────────────────────────────────────────┤
│  Pages statiques (SSG) + Formulaires dynamiques             │
├─────────────────────────────────────────────────────────────┤
│  • Astro / Next.js                                          │
│  • Tailwind CSS                                             │
│  • Composants React (islands)                               │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                      INTÉGRATIONS                           │
├─────────────────────────────────────────────────────────────┤
│  • Calendly / Cal.com (prise RDV)                          │
│  • CRM (HubSpot / Pipedrive / Notion)                      │
│  • Email (Resend / SendGrid)                               │
│  • Analytics (Plausible / Vercel Analytics)                │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Pages & Structure

### Arborescence

```
/
├── Accueil
├── Services
│   ├── Particuliers
│   └── (Entreprises - V2)
├── Comment ça marche
├── Réalisations (Portfolio)
├── Tarifs
├── À propos
├── Contact / RDV
├── FAQ
└── Mentions légales / CGV
```

---

## 4. Détail des pages

### 4.1 Page d'accueil

#### Hero Section
```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│        Votre maison intelligente,                          │
│        sans la complexité.                                  │
│                                                             │
│        [Sous-titre accrocheur sur le service clé en main]  │
│                                                             │
│        [CTA: Prendre RDV - Audit gratuit]                  │
│                                                             │
│        ⭐⭐⭐⭐⭐ "XX clients satisfaits"                    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### Sections
1. **Problème / Solution**
   - "Vous rêvez de domotique mais..."
   - Complexité, incompatibilité, manque de temps
   - "Nous nous occupons de tout"

2. **Services en bref** (3-4 cards)
   - Éclairage intelligent
   - Confort thermique
   - Sécurité connectée
   - Économies d'énergie

3. **Comment ça marche** (3 étapes)
   - Audit gratuit
   - Installation sur-mesure
   - Vous profitez

4. **Témoignages clients**
   - Carousel ou grid
   - Photo, nom, type de projet, citation

5. **Nos partenaires / Technologies**
   - Logos : Home Assistant, Zigbee, etc.
   - Marques : Philips Hue, Shelly, etc.

6. **CTA final**
   - Formulaire simplifié ou bouton RDV

### 4.2 Page Services

#### Structure
```
SERVICES PARTICULIERS
├── Éclairage connecté
│   └── Description, bénéfices, exemples, prix indicatif
├── Volets & ouvrants
│   └── ...
├── Chauffage & climatisation
│   └── ...
├── Sécurité & alarme
│   └── ...
├── Multimédia
│   └── ...
└── Sur-mesure
    └── ESP32, intégrations spéciales
```

#### Pour chaque service
- Icône / illustration
- Description claire (2-3 phrases)
- Bénéfices (liste à puces)
- Produits utilisés (logos)
- Fourchette de prix indicative
- CTA vers contact

### 4.3 Page "Comment ça marche"

#### Timeline visuelle

```
ÉTAPE 1: AUDIT GRATUIT
────────────────────────
📋 RDV à votre domicile (1h)
   • Analyse de vos besoins
   • Étude technique
   • Prise de mesures
   • Conseils personnalisés

         ↓

ÉTAPE 2: DEVIS DÉTAILLÉ
────────────────────────
📄 Proposition sous 48h
   • Choix du matériel
   • Scénarios recommandés
   • Prix transparent
   • Sans engagement

         ↓

ÉTAPE 3: INSTALLATION
────────────────────────
🔧 Intervention soignée
   • Électriciens certifiés
   • Installation propre
   • Configuration complète
   • Tests avant départ

         ↓

ÉTAPE 4: FORMATION
────────────────────────
📱 Prise en main
   • Démonstration complète
   • App sur votre téléphone
   • Documentation fournie

         ↓

ÉTAPE 5: MAINTENANCE
────────────────────────
🛡️ Tranquillité (abonnement)
   • Mises à jour automatiques
   • Support prioritaire
   • Évolutions possibles
```

### 4.4 Page Réalisations / Portfolio

#### Grille de projets
- Photo principale
- Type de projet (appartement, maison)
- Localisation (arrondissement)
- Services installés (tags)
- Budget indicatif

#### Page détail projet
- Galerie photos avant/après
- Contexte & besoins client
- Solutions apportées
- Produits utilisés
- Témoignage client

### 4.5 Page Tarifs

#### Grille tarifaire

```
┌─────────────────┬─────────────────┬─────────────────┐
│    STARTER      │    CONFORT      │    PREMIUM      │
├─────────────────┼─────────────────┼─────────────────┤
│   500-1500€     │   2000-5000€    │   5000€+        │
├─────────────────┼─────────────────┼─────────────────┤
│ • 5-15 devices  │ • 15-40 devices │ • 40+ devices   │
│ • 2-3 pièces    │ • Logement      │ • Maison        │
│ • Éclairage     │   complet       │   complète      │
│ • 1-2 scénarios │ • Multi-zones   │ • Sur-mesure    │
│                 │ • Scénarios     │ • Intégrations  │
│                 │   avancés       │   spéciales     │
├─────────────────┼─────────────────┼─────────────────┤
│    [Devis]      │    [Devis]      │    [Devis]      │
└─────────────────┴─────────────────┴─────────────────┘
```

#### Abonnements maintenance

```
┌─────────────────┬─────────────────┬─────────────────┐
│   ESSENTIEL     │    CONFORT      │    PREMIUM      │
├─────────────────┼─────────────────┼─────────────────┤
│   9,90€/mois    │   19,90€/mois   │   34,90€/mois   │
├─────────────────┼─────────────────┼─────────────────┤
│ • Cloud sécurisé│ • Cloud         │ • Cloud         │
│ • App mobile    │ • App mobile    │ • App mobile    │
│ • Mises à jour  │ • Mises à jour  │ • Mises à jour  │
│                 │ • Support       │ • Support 24/7  │
│                 │   prioritaire   │ • Monitoring    │
│                 │                 │ • Intervention  │
└─────────────────┴─────────────────┴─────────────────┘
```

#### FAQ Tarifs
- Qu'est-ce qui est inclus dans l'installation ?
- Y a-t-il des frais cachés ?
- Puis-je payer en plusieurs fois ?
- L'abonnement est-il obligatoire ?

### 4.6 Page À propos

- Histoire / Vision
- L'équipe (photos, rôles)
- Nos valeurs
- Pourquoi Home Assistant
- Engagements (qualité, SAV, etc.)

### 4.7 Page Contact / RDV

#### Formulaire de contact
```
┌─────────────────────────────────────────────────────────────┐
│  DEMANDER UN AUDIT GRATUIT                                  │
├─────────────────────────────────────────────────────────────┤
│  Nom *             [________________________]               │
│  Prénom *          [________________________]               │
│  Email *           [________________________]               │
│  Téléphone *       [________________________]               │
│                                                             │
│  Type de logement                                           │
│  ( ) Appartement  ( ) Maison  ( ) Autre                    │
│                                                             │
│  Code postal *     [______]                                │
│                                                             │
│  Vos besoins (plusieurs choix possibles)                   │
│  [ ] Éclairage   [ ] Volets   [ ] Chauffage                │
│  [ ] Sécurité    [ ] Multimédia   [ ] Autre                │
│                                                             │
│  Message (optionnel)                                        │
│  [________________________________________________]        │
│  [________________________________________________]        │
│                                                             │
│  [ ] J'accepte d'être recontacté                           │
│                                                             │
│              [Envoyer ma demande]                          │
└─────────────────────────────────────────────────────────────┘
```

#### Alternative : Calendly intégré
- Widget de prise de RDV direct
- Créneaux disponibles visibles
- Confirmation automatique

#### Coordonnées
- Email
- Téléphone
- Zone d'intervention (carte)
- Horaires

### 4.8 Page FAQ

#### Questions fréquentes

**Général**
- C'est quoi la domotique ?
- Pourquoi passer par un professionnel ?
- Est-ce compatible avec mon logement ?

**Technique**
- Qu'est-ce que Home Assistant ?
- Zigbee, WiFi, c'est quoi la différence ?
- Ça marche sans internet ?

**Installation**
- Combien de temps dure l'installation ?
- Faut-il refaire l'électricité ?
- C'est compatible avec mon installation actuelle ?

**Prix & Abonnement**
- Pourquoi un abonnement mensuel ?
- Que se passe-t-il si je résilie ?
- Y a-t-il une garantie ?

**Support**
- Comment contacter le support ?
- Les mises à jour sont-elles automatiques ?
- Puis-je ajouter des équipements plus tard ?

---

## 5. Composants UI

### Header
```
┌─────────────────────────────────────────────────────────────┐
│  [Logo]    Services  Tarifs  Réalisations  FAQ    [RDV]    │
└─────────────────────────────────────────────────────────────┘
```
- Logo cliquable → accueil
- Navigation sticky
- CTA "Prendre RDV" visible
- Menu burger mobile

### Footer
```
┌─────────────────────────────────────────────────────────────┐
│  [Logo]                                                     │
│                                                             │
│  SERVICES          ENTREPRISE       CONTACT                │
│  Éclairage         À propos         Paris, IDF             │
│  Volets            FAQ              email@...              │
│  Chauffage         Réalisations     01 XX XX XX            │
│  Sécurité          Blog                                    │
│                                                             │
│  ─────────────────────────────────────────────────────────│
│  © 2026 [Nom]  •  Mentions légales  •  CGV  •  Politique  │
│                     de confidentialité                     │
│                                                             │
│  [LinkedIn] [Instagram] [Facebook]                         │
└─────────────────────────────────────────────────────────────┘
```

### CTA Buttons
- Primaire : fond couleur brand, texte blanc
- Secondaire : bordure, fond transparent
- Ghost : texte seul avec hover

### Cards
- Service card (icône, titre, description, lien)
- Testimonial card (photo, nom, citation)
- Project card (image, titre, tags)
- Pricing card (titre, prix, features, CTA)

---

## 6. SEO & Performance

### SEO On-page
| Page | Title | Meta Description |
|------|-------|------------------|
| Accueil | Domotique Paris - Installation maison connectée | Transformez votre logement en maison intelligente. Audit gratuit, installation clé en main, maintenance incluse. Paris et IDF. |
| Services | Nos services domotique - Éclairage, sécurité, confort | Découvrez nos solutions domotiques : éclairage connecté, volets, chauffage intelligent, sécurité. Sur-mesure pour votre logement. |
| Tarifs | Tarifs domotique - Devis gratuit | Nos tarifs transparents pour votre projet domotique. À partir de 500€. Abonnement maintenance dès 9,90€/mois. |
| Contact | Contact & RDV - Audit gratuit | Prenez rendez-vous pour un audit gratuit de votre logement. Réponse sous 24h. Intervention Paris et Île-de-France. |

### Performance
- Score Lighthouse > 90
- Images optimisées (WebP, lazy loading)
- Fonts optimisées (preload, subset)
- CSS/JS minifiés
- CDN (Vercel/Cloudflare)

### Schema.org
- LocalBusiness
- Service
- FAQPage
- Review

---

## 7. Intégrations

### Prise de RDV
**Option A : Calendly**
- Widget embedded
- Sync Google Calendar
- Emails de confirmation auto
- Rappels SMS

**Option B : Cal.com**
- Open source
- Self-hosted possible
- Plus de contrôle

### CRM / Leads
**Options :**
- HubSpot (gratuit pour débuter)
- Pipedrive
- Notion (simple)
- Airtable

**Workflow :**
1. Formulaire soumis
2. Webhook → CRM
3. Email notification équipe
4. Email confirmation client
5. Suivi pipeline

### Analytics
- Plausible (privacy-friendly)
- Vercel Analytics
- Google Analytics 4 (si besoin)

### Email
- Resend (moderne, API simple)
- SendGrid
- Mailjet

---

## 8. Design System

### Couleurs (à définir selon branding)
```css
:root {
  /* Primaire - À choisir */
  --color-primary-500: #3B82F6;  /* Bleu tech exemple */
  --color-primary-600: #2563EB;
  --color-primary-700: #1D4ED8;

  /* Secondaire */
  --color-secondary-500: #10B981; /* Vert énergie */

  /* Neutres */
  --color-gray-50: #F9FAFB;
  --color-gray-100: #F3F4F6;
  --color-gray-500: #6B7280;
  --color-gray-900: #111827;

  /* Sémantiques */
  --color-success: #10B981;
  --color-warning: #F59E0B;
  --color-error: #EF4444;
}
```

### Typographie
```css
/* Headings */
font-family: 'Inter', sans-serif;

/* Body */
font-family: 'Inter', sans-serif;

/* Sizes */
--text-xs: 0.75rem;
--text-sm: 0.875rem;
--text-base: 1rem;
--text-lg: 1.125rem;
--text-xl: 1.25rem;
--text-2xl: 1.5rem;
--text-3xl: 1.875rem;
--text-4xl: 2.25rem;
--text-5xl: 3rem;
```

### Spacing
- Utiliser le système Tailwind (4, 8, 12, 16, 24, 32, 48, 64, 96)

### Breakpoints
```css
sm: 640px
md: 768px
lg: 1024px
xl: 1280px
2xl: 1536px
```

---

## 9. Structure projet

```
site-vitrine/
├── src/
│   ├── components/
│   │   ├── ui/
│   │   │   ├── Button.astro
│   │   │   ├── Card.astro
│   │   │   ├── Input.astro
│   │   │   └── ...
│   │   ├── layout/
│   │   │   ├── Header.astro
│   │   │   ├── Footer.astro
│   │   │   └── Navigation.astro
│   │   ├── sections/
│   │   │   ├── Hero.astro
│   │   │   ├── Services.astro
│   │   │   ├── HowItWorks.astro
│   │   │   ├── Testimonials.astro
│   │   │   ├── Pricing.astro
│   │   │   └── CTA.astro
│   │   └── forms/
│   │       ├── ContactForm.tsx
│   │       └── LeadForm.tsx
│   ├── layouts/
│   │   └── BaseLayout.astro
│   ├── pages/
│   │   ├── index.astro
│   │   ├── services.astro
│   │   ├── comment-ca-marche.astro
│   │   ├── realisations.astro
│   │   ├── tarifs.astro
│   │   ├── a-propos.astro
│   │   ├── contact.astro
│   │   ├── faq.astro
│   │   └── mentions-legales.astro
│   ├── styles/
│   │   └── global.css
│   ├── content/
│   │   ├── services/
│   │   ├── projects/
│   │   └── testimonials/
│   └── lib/
│       ├── api.ts
│       └── utils.ts
├── public/
│   ├── images/
│   ├── icons/
│   └── favicon.ico
├── astro.config.mjs
├── tailwind.config.mjs
├── tsconfig.json
├── package.json
└── README.md
```

---

## 10. Roadmap développement

### Sprint 1 - Setup & Structure (1 semaine)
- [ ] Init projet Astro + Bun
- [ ] Config Tailwind
- [ ] Layout de base (Header, Footer)
- [ ] Page d'accueil (structure)
- [ ] Déploiement Vercel

### Sprint 2 - Pages principales (1 semaine)
- [ ] Page Services
- [ ] Page Comment ça marche
- [ ] Page Tarifs
- [ ] Page Contact (formulaire basique)

### Sprint 3 - Contenu & Polish (1 semaine)
- [ ] Page À propos
- [ ] Page FAQ
- [ ] Mentions légales
- [ ] Responsive complet
- [ ] Animations subtiles

### Sprint 4 - Intégrations (1 semaine)
- [ ] Calendly / Cal.com
- [ ] Formulaire → CRM
- [ ] Analytics
- [ ] SEO final
- [ ] Tests cross-browser

---

## 11. Contenu à produire

### Textes
- [ ] Accroches / Headlines
- [ ] Descriptions services
- [ ] Témoignages (réels ou fictifs pour MVP)
- [ ] FAQ complète
- [ ] Mentions légales / CGV

### Visuels
- [ ] Logo (si pas encore fait)
- [ ] Photos installations (stock ou réelles)
- [ ] Icônes services
- [ ] Illustrations process
- [ ] Photos équipe

### Vidéo (optionnel V2)
- [ ] Vidéo présentation
- [ ] Témoignages filmés

---

*Specs v1.0 - Mars 2026*
