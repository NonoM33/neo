import type { JSX } from 'react';
import { useState, useCallback } from 'react';
import { Card, Btn, Icon, Pill } from '../../components/neo';
import type { IconName } from '../../components/neo';
import { ProspectionDashboardPage } from './ProspectionDashboardPage';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
type TabKey = 'dashboard' | 'toolkit' | 'guide' | 'training';

interface QuizQuestion {
  question: string;
  options: string[];
  correct: number;
  explanation: string;
}

// ─────────────────────────────────────────────
// Tab definitions
// ─────────────────────────────────────────────
const TABS: { key: TabKey; label: string; icon: IconName }[] = [
  { key: 'dashboard', label: 'Tableau de bord', icon: 'gauge' },
  { key: 'toolkit', label: 'Boîte à outils', icon: 'settings' },
  { key: 'guide', label: 'Guide du commercial', icon: 'book' },
  { key: 'training', label: 'Formation', icon: 'medal' },
];

// ─────────────────────────────────────────────
// Phone Scripts Data
// ─────────────────────────────────────────────
const PHONE_SCRIPTS = [
  {
    title: 'Premier appel - Prise de contact',
    duration: '3-5 min',
    icon: 'bi-telephone-outbound',
    color: 'var(--neo-primary)',
    tips: [
      'Souriez en parlant, ça s\'entend !',
      'Posez des questions ouvertes',
      'Ne parlez pas du prix à ce stade',
    ],
    script: `**Intro :**
"Bonjour [Prénom], c'est [Votre nom] de Neo Domotique. Comment allez-vous ?"

**Accroche :**
"Je vous contacte suite à [source : votre demande / notre rencontre / la recommandation de X]. ==Vous aviez manifesté un intérêt pour la domotique==, et j'aimerais en savoir plus sur vos besoins."

**Questions de qualification :**
1. "==Qu'est-ce qui vous a donné envie de vous intéresser à la domotique== ?"
2. "Quel type de logement avez-vous ? Maison, appartement ?"
3. "==Quels sont les points qui vous posent le plus de problème au quotidien== ? Chauffage, sécurité, confort ?"
4. "Avez-vous déjà des équipements connectés ?"
5. "==Avez-vous un budget en tête== pour ce projet ?"

**Transition :**
"Merci pour ces informations. ==Ce que je vous propose, c'est qu'on se voie pour faire un audit gratuit de votre logement.== Je pourrai vous montrer concrètement ce qu'on peut faire pour vous."

**Closing :**
"==Est-ce que [jour] à [heure] vous conviendrait pour un rendez-vous== ? Ça prend environ 1h et c'est sans engagement."

**Fin :**
"Parfait, c'est noté. Je vous envoie un email de confirmation. Bonne journée [Prénom] !"`,
  },
  {
    title: 'Appel de suivi - Relance',
    duration: '2-3 min',
    icon: 'bi-telephone-forward',
    color: 'var(--neo-warning)',
    tips: [
      'Rappelez le contexte de votre dernier échange',
      'Apportez de la valeur (info, promo, nouveauté)',
      'Proposez toujours un prochain pas concret',
    ],
    script: `**Intro :**
"Bonjour [Prénom], c'est [Votre nom] de Neo Domotique. ==On s'était parlé le [date]== à propos de votre projet domotique."

**Rappel contexte :**
"==Vous m'aviez parlé de [besoin spécifique]==, et je voulais prendre de vos nouvelles."

**Relance douce :**
"==Avez-vous eu le temps de réfléchir== à notre discussion ? Y a-t-il des points que vous aimeriez clarifier ?"

**Apport de valeur :**
"D'ailleurs, ==je voulais vous informer que [nouveauté/promo/info utile]==. Ça pourrait être intéressant dans votre cas."

**Proposition :**
"==Est-ce qu'on pourrait se revoir cette semaine== pour avancer sur votre projet ? J'ai des créneaux [jour] et [jour]."

**Si pas intéressé :**
"Je comprends tout à fait. ==Est-ce que je peux vous recontacter dans [délai]== ? Les choses auront peut-être évolué."`,
  },
  {
    title: 'Appel de closing - Proposition',
    duration: '5-8 min',
    icon: 'bi-telephone-plus',
    color: 'var(--neo-success)',
    tips: [
      'Résumez les bénéfices, pas les features',
      'Traitez chaque objection avec empathie',
      'Utilisez le silence après une question de closing',
    ],
    script: `**Intro :**
"Bonjour [Prénom], c'est [Votre nom]. ==J'ai finalisé votre proposition personnalisée== et j'ai hâte de vous la présenter."

**Résumé des besoins :**
"==Pour rappel, voici ce qu'on a identifié ensemble :==
- [Besoin 1 : ex. automatiser l'éclairage pour le confort]
- [Besoin 2 : ex. mieux gérer le chauffage pour économiser]
- [Besoin 3 : ex. sécuriser la maison pendant les vacances]"

**Présentation solution :**
"==Voici ce que je vous propose :==
- [Solution 1] → [Bénéfice direct]
- [Solution 2] → [Bénéfice direct]
- [Solution 3] → [Bénéfice direct]
Le tout pour un investissement de [montant]€."

**Argumentaire valeur :**
"==Ce qui est important, c'est le retour sur investissement== : vous allez économiser environ [X]€/an sur votre chauffage, ==soit un amortissement en [X] ans==."

**Question de closing :**
"==Qu'en pensez-vous ? Est-ce que ça correspond à ce que vous attendiez ?=="

**Si objection → voir section Objections**

**Closing final :**
"Parfait ! ==On peut démarrer dès [date].== Je vous envoie le bon de commande par email. ==Il vous suffit de le signer électroniquement== et on planifie l'installation."`,
  },
];

// ─────────────────────────────────────────────
// Email Templates Data
// ─────────────────────────────────────────────
const EMAIL_TEMPLATES = [
  {
    title: 'Email de premier contact',
    icon: 'bi-envelope-plus',
    context: 'Après une rencontre en salon ou un premier contact',
    subject: 'Ravi de vous avoir rencontré - Neo Domotique',
    body: `Bonjour [Prénom],

C'était un plaisir d'échanger avec vous [au salon X / lors de notre rencontre].

Comme évoqué, Neo Domotique accompagne les particuliers dans la mise en place de solutions domotiques sur mesure : éclairage, chauffage, sécurité, multimédia... Le tout avec des marques fiables et un service d'installation professionnel.

Pour votre projet de [type de projet], je pense que nous pourrions vous proposer une solution très adaptée.

Je vous propose un audit gratuit et sans engagement de votre logement. Cela nous permettra de définir ensemble les meilleures options pour votre confort et votre budget.

Seriez-vous disponible [jour 1] ou [jour 2] pour un rendez-vous d'environ 1h ?

Au plaisir d'en discuter,
[Votre prénom]
Commercial Neo Domotique
[Téléphone]`,
  },
  {
    title: 'Email de suivi post-visite',
    icon: 'bi-envelope-check',
    context: 'Après une visite technique / audit au domicile',
    subject: 'Suite à notre visite - Votre projet domotique',
    body: `Bonjour [Prénom],

Merci de m'avoir accueilli chez vous [jour]. J'ai été ravi de découvrir votre logement et de comprendre vos besoins en détail.

Suite à notre audit, voici un résumé des points clés identifiés :
- [Point 1 : ex. isolation perfectible → solution chauffage intelligent]
- [Point 2 : ex. besoin de sécurité → système d'alarme connecté]
- [Point 3 : ex. confort au quotidien → éclairage et volets automatisés]

Je prépare actuellement votre proposition détaillée avec le chiffrage précis. Vous la recevrez d'ici [délai, ex. 48h].

En attendant, n'hésitez pas si vous avez des questions.

Bien cordialement,
[Votre prénom]
Commercial Neo Domotique
[Téléphone]`,
  },
  {
    title: "Email d'envoi de devis",
    icon: 'bi-envelope-paper',
    context: "Envoi d'une proposition commerciale / devis",
    subject: 'Votre devis Neo Domotique - Projet [type]',
    body: `Bonjour [Prénom],

Comme promis, veuillez trouver ci-joint votre proposition personnalisée pour votre projet domotique.

Récapitulatif de votre projet :
- [Prestation 1] : [montant]€
- [Prestation 2] : [montant]€
- [Prestation 3] : [montant]€
- Installation et mise en service incluses
Total : [montant total]€ TTC

Ce que ce projet va changer pour vous :
✅ [Bénéfice 1 : ex. Jusqu'à 25% d'économies sur le chauffage]
✅ [Bénéfice 2 : ex. Maison sécurisée 24h/24 même en vacances]
✅ [Bénéfice 3 : ex. Pilotage de tout votre logement depuis votre smartphone]

Ce devis est valable 30 jours. Je vous propose qu'on en discute par téléphone cette semaine. Seriez-vous disponible [jour] à [heure] ?

N'hésitez pas pour toute question.

Bien cordialement,
[Votre prénom]
Commercial Neo Domotique
[Téléphone]`,
  },
  {
    title: 'Email de relance',
    icon: 'bi-envelope-arrow-up',
    context: 'Relance après envoi de devis sans réponse (5-7 jours)',
    subject: 'Des nouvelles de votre projet domotique ?',
    body: `Bonjour [Prénom],

Je me permets de revenir vers vous concernant la proposition que je vous ai envoyée le [date].

Avez-vous eu le temps de l'étudier ? Je comprendrais tout à fait que vous ayez des questions ou des points à clarifier.

Pour votre information :
💡 [Info utile : ex. La subvention MaPrimeRénov' est encore disponible pour les projets de chauffage connecté]
📅 Nos plannings d'installation se remplissent vite pour [mois]. En validant cette semaine, on pourrait vous installer dès [date].

Je reste à votre disposition pour en discuter par téléphone ou pour une nouvelle visite si besoin.

Bien cordialement,
[Votre prénom]
Commercial Neo Domotique
[Téléphone]`,
  },
];

// ─────────────────────────────────────────────
// Objections Data
// ─────────────────────────────────────────────
const OBJECTIONS = [
  {
    objection: "C'est trop cher",
    response:
      "Je comprends votre préoccupation sur le budget. Regardons les choses autrement : avec les économies d'énergie (chauffage intelligent = -25% en moyenne), votre investissement est amorti en 3-4 ans. Ensuite, ce sont des économies nettes. Et on peut aussi étaler le paiement ou commencer par les postes les plus rentables.",
    tip: "Toujours ramener au coût mensuel et au ROI. Ex: \"Ça revient à 45€/mois, soit moins que votre abonnement Netflix + Spotify.\"",
  },
  {
    objection: 'Je dois en parler avec mon conjoint',
    response:
      "Bien sûr, c'est un projet qui concerne toute la famille. Est-ce que votre conjoint(e) serait disponible pour un appel rapide cette semaine ? Je pourrais répondre directement à ses questions. Ou si vous préférez, on peut organiser une courte visite ensemble, comme ça tout le monde est aligné.",
    tip: "Proposez toujours d'inclure le conjoint dans l'échange suivant. L'objectif est de ne PAS laisser votre prospect \"vendre\" à votre place.",
  },
  {
    objection: 'Je vais réfléchir',
    response:
      "Je comprends, c'est important de prendre le temps. Pour vous aider dans votre réflexion, quel est le point principal qui vous fait hésiter ? [Écouter] Je peux peut-être vous apporter des éléments complémentaires. Et sachez que notre offre actuelle avec [avantage] est valable jusqu'au [date].",
    tip: "\"Je vais réfléchir\" cache souvent une objection non exprimée. Creusez avec douceur pour identifier le vrai frein.",
  },
  {
    objection: "J'ai déjà un devis moins cher",
    response:
      "C'est très bien d'avoir comparé ! Puis-je vous demander ce qui est inclus dans cet autre devis ? Chez Neo, nos prix incluent : l'étude technique, l'installation par un professionnel certifié, la configuration personnalisée, la formation à l'utilisation et 2 ans de support. Comparons à périmètre égal.",
    tip: 'Ne dénigrez jamais la concurrence. Mettez en avant VOS différenciateurs : qualité de service, marques premium, support inclus.',
  },
  {
    objection: "Ce n'est pas le bon moment",
    response:
      "Je comprends que le timing soit important. En revanche, sachez que les prix des équipements augmentent régulièrement (environ +5-10%/an). En planifiant maintenant, on bloque les tarifs actuels. Et on peut tout à fait planifier l'installation à la date qui vous convient, même dans 2-3 mois.",
    tip: "Le \"pas le bon moment\" est souvent un prétexte. Identifiez si c'est un vrai frein temporel (travaux en cours, budget bloqué) ou une esquive.",
  },
  {
    objection: "La domotique c'est compliqué",
    response:
      "C'est justement notre métier de rendre ça simple ! On s'occupe de tout : installation, configuration, et on vous forme. En 5 minutes, je vous montre sur mon téléphone à quel point c'est intuitif. [Démonstration app]. Et si vous avez une question, notre support répond en moins de 24h.",
    tip: "Ayez toujours une démo prête sur votre téléphone. Rien ne convainc plus qu'une démonstration en direct de la simplicité d'utilisation.",
  },
  {
    objection: "J'ai peur des pannes",
    response:
      "C'est une question légitime. Nos systèmes sont conçus pour être fiables : les marques que nous utilisons (Philips Hue, Somfy, Ajax...) ont des taux de fiabilité supérieurs à 99%. En cas de panne internet, tout continue de fonctionner localement. Et notre support réactif intervient sous 48h si besoin.",
    tip: "Rassurez avec des chiffres concrets et le fonctionnement hors-ligne. Mentionnez la garantie 2 ans et le SAV inclus.",
  },
  {
    objection: 'Mon logement est trop ancien',
    response:
      "Au contraire, c'est dans les logements anciens qu'on apporte le plus de valeur ! La domotique est majoritairement sans fil, donc pas de gros travaux. On pose des modules derrière vos interrupteurs existants, des capteurs discrets... Et pour le chauffage, un thermostat intelligent s'installe en 30 minutes sur n'importe quel système.",
    tip: "Préparez des photos avant/après d'installations dans des logements anciens. C'est très rassurant pour le prospect.",
  },
];

// ─────────────────────────────────────────────
// Daily Routine Data
// ─────────────────────────────────────────────
const DAILY_ROUTINE = [
  {
    time: '08:30',
    title: 'Préparation',
    description: 'Consulter l\'agenda, vérifier le CRM, prioriser les leads du jour',
    icon: 'bi-sunrise',
    color: '#f59e0b',
    duration: '30 min',
  },
  {
    time: '09:00',
    title: 'Bloc appels',
    description: '2h de prospection téléphonique. Objectif : 15-20 appels',
    icon: 'bi-telephone',
    color: 'var(--neo-primary)',
    duration: '2h',
  },
  {
    time: '11:00',
    title: 'Qualification',
    description: 'Qualifier les nouveaux leads, mettre à jour les scores dans le CRM',
    icon: 'bi-clipboard-check',
    color: '#0dcaf0',
    duration: '30 min',
  },
  {
    time: '11:30',
    title: 'Pause / Admin',
    description: 'Emails, paperasse, pause café bien méritée',
    icon: 'bi-cup-hot',
    color: '#6c757d',
    duration: '30 min',
  },
  {
    time: '12:00',
    title: 'Déjeuner',
    description: 'Recharger les batteries pour l\'après-midi terrain',
    icon: 'bi-egg-fried',
    color: '#198754',
    duration: '1h30',
  },
  {
    time: '13:30',
    title: 'RDV terrain',
    description: 'Visites clients, audits techniques, présentations de devis',
    icon: 'bi-geo-alt',
    color: '#dc3545',
    duration: '3h',
  },
  {
    time: '16:30',
    title: 'Suivi',
    description: 'Mettre à jour le CRM, envoyer les emails de suivi, préparer les devis',
    icon: 'bi-pencil-square',
    color: '#7c3aed',
    duration: '30 min',
  },
  {
    time: '17:00',
    title: 'Préparation lendemain',
    description: 'Définir les priorités, préparer les dossiers des RDV du lendemain',
    icon: 'bi-calendar-check',
    color: '#0d6efd',
    duration: '30 min',
  },
  {
    time: '17:30',
    title: 'Formation',
    description: 'Lire la doc produit, pratiquer le pitch, regarder des vidéos de vente',
    icon: 'bi-book',
    color: '#f59e0b',
    duration: '30 min',
  },
];

// ─────────────────────────────────────────────
// Pipeline Playbook Data
// ─────────────────────────────────────────────
const PLAYBOOK_STAGES = [
  {
    stage: 'Prospect',
    objective: 'Qualifier en 48h',
    color: 'var(--neo-status-prospect)',
    icon: 'bi-person-plus',
    doList: [
      'Appeler dans les 24h suivant la réception du lead',
      'Poser les 5 questions de qualification',
      'Scorer le lead dans le CRM',
      'Planifier un suivi si pas de réponse',
    ],
    dontList: [
      'Envoyer un devis sans avoir qualifié',
      'Attendre plus de 48h pour un premier contact',
      'Parler du prix au premier appel',
    ],
  },
  {
    stage: 'Qualifié',
    objective: 'Proposer sous 1 semaine',
    color: 'var(--neo-status-qualifie)',
    icon: 'bi-person-check',
    doList: [
      'Planifier une visite technique',
      'Préparer un pré-devis',
      'Identifier tous les décisionnaires',
      'Documenter les besoins précis dans le CRM',
    ],
    dontList: [
      'Reporter la visite technique',
      'Oublier de confirmer le RDV la veille',
      'Négliger la mise à jour du CRM',
    ],
  },
  {
    stage: 'Proposition',
    objective: 'Relancer sous 3 jours',
    color: 'var(--neo-status-proposition)',
    icon: 'bi-file-earmark-text',
    doList: [
      'Envoyer le devis dans les 48h post-visite',
      'Appeler pour présenter le devis (pas juste un email)',
      'Préparer les réponses aux objections prévisibles',
      'Relancer à J+3 si pas de retour',
    ],
    dontList: [
      'Envoyer le devis sans appeler',
      'Attendre que le client revienne de lui-même',
      'Proposer une remise tout de suite',
    ],
  },
  {
    stage: 'Négociation',
    objective: 'Closer sous 2 semaines',
    color: 'var(--neo-status-negociation)',
    icon: 'bi-chat-dots',
    doList: [
      'Identifier précisément les freins restants',
      'Ajuster le devis si nécessaire (pas forcément baisser le prix)',
      'Rassurer avec des témoignages / références',
      'Créer un sentiment d\'urgence légitime',
    ],
    dontList: [
      'Baisser le prix sans contrepartie',
      'Être trop insistant (3 relances max)',
      'Négliger les objections du conjoint',
    ],
  },
  {
    stage: 'Gagné',
    objective: 'Fidéliser',
    color: 'var(--neo-status-gagne)',
    icon: 'bi-trophy',
    doList: [
      'Planifier l\'installation rapidement',
      'Envoyer un email de bienvenue',
      'Appeler après installation pour vérifier la satisfaction',
      'Demander un avis Google et des recommandations',
    ],
    dontList: [
      'Disparaître après la signature',
      'Oublier le suivi post-installation',
      'Négliger les opportunités de vente additionnelle',
    ],
  },
];

// ─────────────────────────────────────────────
// Benchmark KPIs Data
// ─────────────────────────────────────────────
const BENCHMARK_KPIS = [
  {
    label: 'Appels / jour',
    target: '15-20',
    stretch: '25',
    icon: 'bi-telephone',
    color: 'var(--neo-primary)',
    percentage: 70,
  },
  {
    label: 'Taux de qualification',
    target: '30-40%',
    stretch: '50%',
    icon: 'bi-funnel',
    color: '#0dcaf0',
    percentage: 55,
  },
  {
    label: 'Taux de conversion',
    target: '20-30%',
    stretch: '35%',
    icon: 'bi-graph-up-arrow',
    color: 'var(--neo-success)',
    percentage: 45,
  },
  {
    label: 'Délai moyen de closing',
    target: '2-4 semaines',
    stretch: '< 2 sem.',
    icon: 'bi-clock',
    color: 'var(--neo-warning)',
    percentage: 60,
  },
  {
    label: 'CA moyen / deal',
    target: '3 000 - 8 000€',
    stretch: '10 000€+',
    icon: 'bi-currency-euro',
    color: '#7c3aed',
    percentage: 65,
  },
  {
    label: 'RDV / semaine',
    target: '8-12',
    stretch: '15',
    icon: 'bi-calendar-event',
    color: '#dc3545',
    percentage: 50,
  },
];

// ─────────────────────────────────────────────
// 10 Commandements
// ─────────────────────────────────────────────
const COMMANDMENTS = [
  { emoji: '⚡', text: 'Tu qualifieras chaque lead en 48h' },
  { emoji: '💬', text: 'Tu ne laisseras jamais un prospect sans réponse plus de 24h' },
  { emoji: '📝', text: 'Tu rempliras le CRM après chaque interaction' },
  { emoji: '🎯', text: 'Tu prépareras chaque visite à l\'avance' },
  { emoji: '👂', text: 'Tu écouteras plus que tu ne parleras (70/30)' },
  { emoji: '👣', text: 'Tu proposeras toujours un prochain pas concret' },
  { emoji: '🔁', text: 'Tu relanceras 3 fois avant d\'abandonner' },
  { emoji: '🤝', text: 'Tu demanderas toujours des recommandations' },
  { emoji: '📚', text: 'Tu te formeras 30 min par jour minimum' },
  { emoji: '🎉', text: 'Tu célébreras chaque victoire, même petite' },
];

// ─────────────────────────────────────────────
// Product Knowledge Data
// ─────────────────────────────────────────────
const PRODUCTS = [
  {
    name: 'Éclairage connecté',
    brand: 'Philips Hue, Shelly',
    icon: 'bi-lightbulb',
    color: '#f59e0b',
    priceRange: '200 - 1 500€',
    sellingPoints: [
      'Ambiances personnalisables selon l\'humeur et le moment',
      'Économies d\'énergie jusqu\'à 80% avec le LED',
      'Automatisation : allumage au mouvement, extinction à la sortie',
    ],
    commonQuestions: [
      'Est-ce compatible avec mes interrupteurs ? → Oui, modules derrière les interrupteurs existants',
      'Et si internet tombe ? → Fonctionne en local via le bridge Hue ou Shelly',
    ],
  },
  {
    name: 'Volets connectés',
    brand: 'Somfy',
    icon: 'bi-window',
    color: '#0d6efd',
    priceRange: '300 - 2 000€',
    sellingPoints: [
      'Économies d\'énergie : gestion automatique selon le soleil',
      'Confort : programmation horaire, scénarios départ/arrivée',
      'Sécurité : simulation de présence pendant les vacances',
    ],
    commonQuestions: [
      'Mes volets actuels sont compatibles ? → La plupart des volets motorisés le sont',
      'C\'est compliqué à installer ? → 30 min par volet, sans travaux',
    ],
  },
  {
    name: 'Chauffage intelligent',
    brand: 'Tado°',
    icon: 'bi-thermometer-half',
    color: '#dc3545',
    priceRange: '400 - 2 500€',
    sellingPoints: [
      'ROI rapide : économies de 20-25% sur la facture de chauffage',
      'Confort optimal : température pièce par pièce',
      'Géolocalisation : baisse automatique quand personne n\'est là',
    ],
    commonQuestions: [
      'Compatible avec ma chaudière ? → Compatible 95% des chaudières et pompes à chaleur',
      'L\'amortissement ? → Généralement 2-3 ans avec les économies réalisées',
    ],
  },
  {
    name: 'Sécurité',
    brand: 'Ajax Systems',
    icon: 'bi-shield-check',
    color: '#198754',
    priceRange: '500 - 3 000€',
    sellingPoints: [
      'Système professionnel sans fil, installation en 2h',
      'Détection de mouvement, ouverture, fumée, fuite d\'eau',
      'Alertes instantanées sur smartphone + sirène 105dB',
    ],
    commonQuestions: [
      'Et les fausses alertes ? → Système anti-fausse-alarme par double vérification',
      'Sans abonnement ? → Oui, le système est autonome, pas de frais mensuels',
    ],
  },
  {
    name: 'Multimédia',
    brand: 'Sonos',
    icon: 'bi-music-note-beamed',
    color: '#7c3aed',
    priceRange: '300 - 3 000€',
    sellingPoints: [
      'Audio premium dans chaque pièce, sans fil',
      'Compatible tous les services de streaming',
      'Multiroom : musique synchronisée ou différente par pièce',
    ],
    commonQuestions: [
      'Ça marche avec Spotify / Apple Music ? → Oui, tous les services majeurs',
      'La qualité sonore ? → Qualité studio, testée et approuvée par les audiophiles',
    ],
  },
  {
    name: 'Réseau',
    brand: 'Ubiquiti (UniFi)',
    icon: 'bi-wifi',
    color: '#0dcaf0',
    priceRange: '300 - 1 500€',
    sellingPoints: [
      'WiFi professionnel couvrant toute la maison sans zone morte',
      'Indispensable pour la domotique : réseau stable et rapide',
      'Gestion centralisée de tous les appareils connectés',
    ],
    commonQuestions: [
      'Ma box opérateur ne suffit pas ? → Pour 5+ appareils connectés, un vrai réseau est recommandé',
      'C\'est compliqué à gérer ? → On configure tout, vous n\'y touchez plus',
    ],
  },
];

// ─────────────────────────────────────────────
// Sales Techniques Data
// ─────────────────────────────────────────────
const SALES_TECHNIQUES = {
  spin: {
    title: 'SPIN Selling',
    subtitle: 'La méthode pour découvrir les vrais besoins',
    steps: [
      {
        letter: 'S',
        name: 'Situation',
        color: 'var(--neo-primary)',
        description: 'Comprendre le contexte actuel du client',
        examples: [
          'Quel type de logement avez-vous ?',
          'Combien de pièces ?',
          'Quel est votre système de chauffage actuel ?',
        ],
      },
      {
        letter: 'P',
        name: 'Problème',
        color: 'var(--neo-warning)',
        description: 'Identifier les difficultés et insatisfactions',
        examples: [
          'Qu\'est-ce qui vous pose problème au quotidien ?',
          'Êtes-vous satisfait de votre facture d\'énergie ?',
          'Vous sentez-vous en sécurité quand vous partez en vacances ?',
        ],
      },
      {
        letter: 'I',
        name: 'Implication',
        color: 'var(--neo-danger)',
        description: 'Amplifier les conséquences du problème',
        examples: [
          'Combien ça vous coûte par an ce chauffage mal régulé ?',
          'Qu\'est-ce qui se passerait en cas d\'intrusion ?',
          'Quel impact sur votre confort au quotidien ?',
        ],
      },
      {
        letter: 'N',
        name: 'Need-payoff',
        color: 'var(--neo-success)',
        description: 'Faire visualiser la solution et ses bénéfices',
        examples: [
          'Et si vous pouviez tout contrôler depuis votre téléphone ?',
          'Imaginez économiser 500€/an de chauffage...',
          'Si votre maison se sécurisait automatiquement en partant ?',
        ],
      },
    ],
  },
  soncas: {
    title: 'La méthode SONCAS',
    subtitle: 'Identifier le profil psychologique de votre client',
    profiles: [
      {
        letter: 'S',
        name: 'Sécurité',
        color: '#198754',
        icon: 'bi-shield-check',
        description: 'Client qui a besoin d\'être rassuré',
        signals: ['Pose beaucoup de questions', 'Veut des garanties', 'Hésite longuement'],
        approach: 'Mettez en avant : garantie 2 ans, marques reconnues, SAV réactif, témoignages clients',
      },
      {
        letter: 'O',
        name: 'Orgueil',
        color: '#7c3aed',
        icon: 'bi-star',
        description: 'Client qui veut le meilleur, être valorisé',
        signals: ['Parle de ses réussites', 'Compare au haut de gamme', 'Veut impressionner'],
        approach: 'Mettez en avant : exclusivité, design premium, technologie de pointe, "peu de gens ont ça"',
      },
      {
        letter: 'N',
        name: 'Nouveauté',
        color: '#0dcaf0',
        icon: 'bi-rocket-takeoff',
        description: 'Client early-adopter, curieux',
        signals: ['S\'intéresse à la tech', 'Pose des questions techniques', 'Veut les dernières nouveautés'],
        approach: 'Mettez en avant : innovation, dernières fonctionnalités, évolutivité, compatibilité future',
      },
      {
        letter: 'C',
        name: 'Confort',
        color: '#f59e0b',
        icon: 'bi-house-heart',
        description: 'Client qui cherche la simplicité et le bien-être',
        signals: ['Parle de son quotidien', 'Veut que ce soit simple', 'Cherche le gain de temps'],
        approach: 'Mettez en avant : automatisation, simplicité d\'utilisation, scénarios du quotidien, "ça se fait tout seul"',
      },
      {
        letter: 'A',
        name: 'Argent',
        color: '#dc3545',
        icon: 'bi-piggy-bank',
        description: 'Client sensible au prix et au ROI',
        signals: ['Demande le prix rapidement', 'Compare les devis', 'Parle de budget'],
        approach: 'Mettez en avant : économies d\'énergie, amortissement, coût mensuel, aides disponibles',
      },
      {
        letter: 'S',
        name: 'Sympathie',
        color: '#fd7e14',
        icon: 'bi-emoji-smile',
        description: 'Client qui achète la relation humaine',
        signals: ['Très chaleureux', 'Pose des questions personnelles', 'Fait confiance au feeling'],
        approach: 'Mettez en avant : relation de confiance, disponibilité, proximité, "on sera toujours là pour vous"',
      },
    ],
  },
  closingTechniques: [
    {
      name: 'L\'alternative',
      icon: 'bi-signpost-split',
      description: 'Proposer deux options au lieu d\'une question oui/non',
      example: '"Vous préférez qu\'on commence par l\'éclairage ou par le chauffage ?"',
    },
    {
      name: 'Le bilan',
      icon: 'bi-list-check',
      description: 'Résumer tous les avantages acceptés par le client',
      example: '"Récapitulons : vous voulez le confort, les économies et la sécurité. Notre solution coche toutes les cases, non ?"',
    },
    {
      name: 'L\'urgence',
      icon: 'bi-alarm',
      description: 'Créer un sentiment de rareté légitime',
      example: '"Nos plannings se remplissent vite. En validant cette semaine, je peux vous installer avant Noël."',
    },
    {
      name: 'L\'essai',
      icon: 'bi-hand-index',
      description: 'Proposer un premier pas engageant mais petit',
      example: '"Et si on commençait par une pièce test ? Vous verrez le résultat et on étendra ensuite."',
    },
    {
      name: 'Le silence',
      icon: 'bi-pause-circle',
      description: 'Après la question de closing, ne rien dire',
      example: '"Qu\'en pensez-vous ?" → [Silence. Celui qui parle en premier a perdu.]',
    },
  ],
};

// ─────────────────────────────────────────────
// Quiz Data
// ─────────────────────────────────────────────
const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    question: 'Un prospect vous dit "Je vais réfléchir". Quelle est la meilleure réaction ?',
    options: [
      'Dire "D\'accord, recontactez-moi quand vous serez prêt"',
      'Demander "Quel est le point principal qui vous fait hésiter ?"',
      'Proposer immédiatement une remise de 10%',
      'Envoyer un email de relance le lendemain',
    ],
    correct: 1,
    explanation:
      'L\'objection "je vais réfléchir" cache souvent un frein non exprimé. Il faut creuser avec empathie pour identifier le vrai blocage.',
  },
  {
    question: 'Dans la méthode SPIN, que signifie le "I" ?',
    options: [
      'Intention - Comprendre ce que veut le client',
      'Implication - Amplifier les conséquences du problème',
      'Information - Collecter des données sur le client',
      'Investissement - Parler du budget',
    ],
    correct: 1,
    explanation:
      'Le "I" de SPIN signifie Implication : on amplifie les conséquences du problème pour que le client ressente l\'urgence de le résoudre.',
  },
  {
    question: 'Quel est le ratio idéal écoute/parole pour un commercial ?',
    options: ['50/50', '30/70 (parler plus)', '70/30 (écouter plus)', '90/10 (presque que écouter)'],
    correct: 2,
    explanation:
      'Un bon commercial écoute 70% du temps et parle 30%. C\'est en écoutant qu\'on comprend les vrais besoins et qu\'on peut adapter son discours.',
  },
  {
    question: 'Un client dit "C\'est trop cher". Que faites-vous en premier ?',
    options: [
      'Proposer une remise',
      'Ramener au coût mensuel et au ROI',
      'Dire que c\'est le prix du marché',
      'Proposer une solution moins chère',
    ],
    correct: 1,
    explanation:
      'Avant de baisser le prix, reformulez la valeur. "45€/mois pour le confort et 25% d\'économies sur le chauffage, c\'est un investissement qui se rembourse tout seul."',
  },
  {
    question: 'Combien de relances faut-il faire avant d\'abandonner un prospect ?',
    options: ['1 seule, pour ne pas être insistant', '3 relances minimum', '5 relances', 'Autant que nécessaire'],
    correct: 1,
    explanation:
      'La règle des 3 relances : 80% des ventes se font entre la 2e et la 5e relance. 3 relances espacées est le minimum avant de classer un prospect.',
  },
];

// ═════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════
export default function ProspectionHubPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('dashboard');

  return (
    <div style={{ padding: 28 }}>
      {/* Page Header */}
      <div className="page-head">
        <div className="ph-l">
          <h1>
            <Icon name="rocket" size={22} style={{ verticalAlign: '-3px', marginRight: 8, color: 'var(--komun)' }} />
            Hub Commercial
          </h1>
          <p>Votre centre de ressources pour performer au quotidien</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="seg" style={{ marginBottom: 22, flexWrap: 'wrap' }}>
        {TABS.map((tab) => (
          <button
            key={tab.key}
            className={activeTab === tab.key ? 'on' : ''}
            onClick={() => setActiveTab(tab.key)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}
          >
            <Icon name={tab.icon} size={15} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'dashboard' && <DashboardTab />}
      {activeTab === 'toolkit' && <ToolkitTab />}
      {activeTab === 'guide' && <GuideTab />}
      {activeTab === 'training' && <TrainingTab />}
    </div>
  );
}

// ─────────────────────────────────────────────
// Section heading helper (presentation only)
// ─────────────────────────────────────────────
function SectionHeading({ icon, title, sub }: { icon: IconName; title: string; sub?: string }) {
  return (
    <>
      <h2
        style={{
          fontSize: 18,
          fontWeight: 600,
          letterSpacing: '-0.01em',
          color: 'var(--ink)',
          margin: '0 0 4px',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <Icon name={icon} size={18} style={{ color: 'var(--komun)' }} />
        {title}
      </h2>
      {sub && <p style={{ color: 'var(--ink-3)', fontSize: 13, margin: '0 0 16px' }}>{sub}</p>}
    </>
  );
}

// ═════════════════════════════════════════════
// TAB 1: DASHBOARD
// ═════════════════════════════════════════════
function DashboardTab() {
  return <ProspectionDashboardPage />;
}

// ═════════════════════════════════════════════
// TAB 2: TOOLKIT (Boîte à outils)
// ═════════════════════════════════════════════
function ToolkitTab() {
  return (
    <div className="toolkit-tab">
      {/* Phone Scripts */}
      <PhoneScriptsSection />

      {/* Email Templates */}
      <EmailTemplatesSection />

      {/* Objection Handling */}
      <ObjectionHandlingSection />
    </div>
  );
}

function PhoneScriptsSection() {
  const [openScript, setOpenScript] = useState<number | null>(null);

  return (
    <div style={{ marginBottom: 36 }}>
      <SectionHeading
        icon="phone"
        title="Scripts téléphoniques"
        sub="Des trames prêtes à l'emploi pour chaque type d'appel. Adaptez-les à votre style !"
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {PHONE_SCRIPTS.map((script, index) => (
          <Card key={index} flush>
            <button
              type="button"
              onClick={() => setOpenScript(openScript === index ? null : index)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '16px 18px',
                background: 'none',
                border: 'none',
                font: 'inherit',
                fontWeight: 600,
                color: 'var(--ink)',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <i className={`bi ${script.icon}`} style={{ color: script.color }}></i>
              <span style={{ marginRight: 'auto' }}>{script.title}</span>
              <span className="pill neutral">
                <Icon name="clock" size={13} />
                {script.duration}
              </span>
              <Icon name={openScript === index ? 'chevronDown' : 'chevronRight'} size={16} style={{ color: 'var(--ink-3)' }} />
            </button>
            {openScript === index && (
              <div style={{ padding: '0 18px 18px' }}>
                {/* Tips */}
                <div
                  style={{
                    background: 'var(--komun-soft)',
                    border: '1px solid var(--line)',
                    borderRadius: 'var(--r-md)',
                    padding: 14,
                    marginBottom: 14,
                  }}
                >
                  <div style={{ fontWeight: 600, marginBottom: 8 }}>
                    <Icon name="zap" size={14} style={{ verticalAlign: '-2px', marginRight: 4 }} /> Conseils de réussite
                  </div>
                  <ul style={{ margin: 0, fontSize: 13, paddingLeft: 18 }}>
                    {script.tips.map((tip, i) => (
                      <li key={i}>{tip}</li>
                    ))}
                  </ul>
                </div>

                {/* Script content */}
                <div
                  style={{
                    padding: 14,
                    borderRadius: 'var(--r-md)',
                    background: 'var(--paper-2)',
                    color: 'var(--ink)',
                    border: '1px solid var(--line)',
                  }}
                >
                  <ScriptContent text={script.script} />
                </div>
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}

function ScriptContent({ text }: { text: string }) {
  // Parse markdown-like formatting: **bold**, ==highlight==
  const lines = text.split('\n');

  return (
    <div className="script-content" style={{ lineHeight: 1.8, fontSize: 13 }}>
      {lines.map((line, i) => {
        if (!line.trim()) return <br key={i} />;

        // Process bold (**text**) and highlight (==text==)
        const processed = line;
        const parts: JSX.Element[] = [];
        let lastIndex = 0;
        const regex = /(\*\*(.*?)\*\*)|(==(.*?)==)/g;
        let match;

        while ((match = regex.exec(processed)) !== null) {
          // Add text before match
          if (match.index > lastIndex) {
            parts.push(<span key={`t${i}-${lastIndex}`}>{processed.slice(lastIndex, match.index)}</span>);
          }
          if (match[2]) {
            // Bold
            parts.push(<strong key={`b${i}-${match.index}`}>{match[2]}</strong>);
          } else if (match[4]) {
            // Highlight
            parts.push(
              <mark
                key={`h${i}-${match.index}`}
                style={{ padding: '0 4px', borderRadius: 4 }}
              >
                {match[4]}
              </mark>
            );
          }
          lastIndex = match.index + match[0].length;
        }
        if (lastIndex < processed.length) {
          parts.push(<span key={`e${i}`}>{processed.slice(lastIndex)}</span>);
        }

        if (parts.length === 0) {
          parts.push(<span key={`l${i}`}>{line}</span>);
        }

        return (
          <div key={i}>
            {parts}
          </div>
        );
      })}
    </div>
  );
}

function EmailTemplatesSection() {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleCopy = useCallback(async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch {
      // Fallback
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    }
  }, []);

  return (
    <div style={{ marginBottom: 36 }}>
      <SectionHeading
        icon="mail"
        title="Templates email"
        sub={'Des modèles d\'email prêts à personnaliser. Cliquez sur "Copier" pour les utiliser.'}
      />

      <div className="grid-2">
        {EMAIL_TEMPLATES.map((template, index) => (
          <Card
            key={index}
            head={template.title}
            action={
              <Btn
                variant={copiedIndex === index ? 'success' : 'subtle'}
                size="sm"
                icon={copiedIndex === index ? 'check' : 'fileText'}
                onClick={() => handleCopy(`Objet : ${template.subject}\n\n${template.body}`, index)}
              >
                {copiedIndex === index ? 'Copié !' : 'Copier'}
              </Btn>
            }
          >
            <div className="card-body">
              <p style={{ color: 'var(--ink-3)', fontSize: 13, margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Icon name="help" size={14} />
                {template.context}
              </p>
              <div
                style={{
                  marginBottom: 8,
                  padding: 10,
                  borderRadius: 'var(--r-sm)',
                  background: 'var(--paper-2)',
                  color: 'var(--ink)',
                  border: '1px solid var(--line)',
                }}
              >
                <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--ink-3)' }}>Objet :</span>
                <br />
                <span style={{ fontSize: 13, fontWeight: 500 }}>{template.subject}</span>
              </div>
              <div
                style={{
                  padding: 10,
                  borderRadius: 'var(--r-sm)',
                  fontSize: 13,
                  background: 'var(--paper-2)',
                  color: 'var(--ink)',
                  border: '1px solid var(--line)',
                  whiteSpace: 'pre-line',
                  maxHeight: 200,
                  overflowY: 'auto',
                }}
              >
                {template.body}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function ObjectionHandlingSection() {
  const [openObjection, setOpenObjection] = useState<number | null>(null);

  return (
    <div style={{ marginBottom: 36 }}>
      <SectionHeading
        icon="shield"
        title="Traitement des objections"
        sub="Les 8 objections les plus courantes et comment y répondre avec assurance."
      />

      <div className="grid-2">
        {OBJECTIONS.map((item, index) => (
          <div
            key={index}
            className="card"
            style={{ cursor: 'pointer' }}
            onClick={() => setOpenObjection(openObjection === index ? null : index)}
          >
            {/* Objection */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
              <Pill tone="danger">Objection</Pill>
              <span style={{ fontWeight: 600, color: 'var(--danger)' }}>
                "{item.objection}"
              </span>
              <Icon
                name={openObjection === index ? 'chevronDown' : 'chevronRight'}
                size={16}
                style={{ marginLeft: 'auto', color: 'var(--ink-3)' }}
              />
            </div>

            {/* Response (shown when expanded) */}
            {openObjection === index && (
              <div style={{ marginTop: 12 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
                  <Pill tone="success">Réponse</Pill>
                </div>
                <p style={{ fontSize: 13, marginBottom: 12, color: 'var(--ink)', lineHeight: 1.7 }}>
                  {item.response}
                </p>

                <div
                  style={{
                    padding: 10,
                    borderRadius: 'var(--r-sm)',
                    fontSize: 13,
                    background: 'var(--komun-soft)',
                    color: 'var(--komun-ink)',
                    borderLeft: '3px solid var(--komun)',
                  }}
                >
                  <Icon name="zap" size={14} style={{ verticalAlign: '-2px', marginRight: 4 }} />
                  <strong>Astuce :</strong> {item.tip}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════
// TAB 3: GUIDE DU COMMERCIAL
// ═════════════════════════════════════════════
function GuideTab() {
  return (
    <div className="guide-tab">
      <DailyRoutineSection />
      <PlaybookSection />
      <BenchmarkKPIsSection />
      <CommandmentsSection />
    </div>
  );
}

function DailyRoutineSection() {
  return (
    <div style={{ marginBottom: 36 }}>
      <SectionHeading
        icon="clock"
        title="Ma journée type"
        sub="L'organisation idéale pour maximiser votre productivité et vos résultats."
      />

      <Card>
        <div style={{ position: 'relative' }}>
          {DAILY_ROUTINE.map((item, index) => (
            <div style={{ display: 'flex', marginBottom: 16 }} key={index}>
              {/* Time column */}
              <div
                style={{ width: 60, textAlign: 'right', marginRight: 12, flexShrink: 0, fontWeight: 600, color: item.color, fontSize: 14 }}
              >
                {item.time}
              </div>

              {/* Timeline dot and line */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginRight: 12, flexShrink: 0, width: 24 }}>
                <div
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    background: item.color,
                    color: '#fff',
                    fontSize: '0.65rem',
                  }}
                >
                  <i className={`bi ${item.icon}`}></i>
                </div>
                {index < DAILY_ROUTINE.length - 1 && (
                  <div
                    style={{
                      flexGrow: 1,
                      width: 2,
                      background: 'var(--line)',
                      minHeight: 20,
                    }}
                  ></div>
                )}
              </div>

              {/* Content */}
              <div style={{ flexGrow: 1, paddingBottom: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontWeight: 600 }}>{item.title}</span>
                  <span className="pill neutral">{item.duration}</span>
                </div>
                <p style={{ color: 'var(--ink-3)', fontSize: 13, margin: 0 }}>{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function PlaybookSection() {
  const [openStage, setOpenStage] = useState<number | null>(null);

  return (
    <div style={{ marginBottom: 36 }}>
      <SectionHeading
        icon="crosshair"
        title="Playbook par étape"
        sub="Pour chaque étape du pipeline, les actions à faire et les erreurs à éviter."
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {PLAYBOOK_STAGES.map((stage, index) => (
          <div
            key={index}
            className="card"
            style={{ cursor: 'pointer' }}
            onClick={() => setOpenStage(openStage === index ? null : index)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  background: stage.color,
                  color: '#fff',
                }}
              >
                <i className={`bi ${stage.icon}`}></i>
              </div>
              <div style={{ flexGrow: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontWeight: 600 }}>{stage.stage}</span>
                  <span className="pill neutral">Objectif : {stage.objective}</span>
                </div>
              </div>
              <Icon name={openStage === index ? 'chevronDown' : 'chevronRight'} size={16} style={{ color: 'var(--ink-3)' }} />
            </div>

            {openStage === index && (
              <div className="grid-2" style={{ marginTop: 12 }}>
                <div
                  style={{ padding: 14, borderRadius: 'var(--r-md)', height: '100%', background: 'var(--success-soft)', border: '1px solid var(--line)' }}
                >
                  <div style={{ fontWeight: 600, marginBottom: 8, color: 'var(--success-ink)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Icon name="checkCircle" size={15} /> À faire
                  </div>
                  <ul style={{ fontSize: 13, margin: 0, paddingLeft: 18 }}>
                    {stage.doList.map((item, i) => (
                      <li key={i} style={{ marginBottom: 4 }}>{item}</li>
                    ))}
                  </ul>
                </div>
                <div
                  style={{ padding: 14, borderRadius: 'var(--r-md)', height: '100%', background: 'var(--danger-soft)', border: '1px solid var(--line)' }}
                >
                  <div style={{ fontWeight: 600, marginBottom: 8, color: 'var(--danger-ink)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Icon name="x" size={15} /> À ne PAS faire
                  </div>
                  <ul style={{ fontSize: 13, margin: 0, paddingLeft: 18 }}>
                    {stage.dontList.map((item, i) => (
                      <li key={i} style={{ marginBottom: 4 }}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function BenchmarkKPIsSection() {
  return (
    <div style={{ marginBottom: 36 }}>
      <SectionHeading
        icon="chart"
        title="Métriques de référence"
        sub="Les benchmarks d'un commercial performant chez Neo."
      />

      <div className="grid-3">
        {BENCHMARK_KPIS.map((kpi, index) => (
          <Card key={index}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  background: kpi.color,
                  color: '#fff',
                  fontSize: '0.85rem',
                }}
              >
                <i className={`bi ${kpi.icon}`}></i>
              </div>
              <span style={{ fontWeight: 600 }}>{kpi.label}</span>
            </div>

            {/* Progress bar */}
            <div style={{ height: 8, borderRadius: 99, background: 'var(--paper-2)', overflow: 'hidden', marginBottom: 8 }}>
              <div
                role="progressbar"
                style={{ width: `${kpi.percentage}%`, height: '100%', background: kpi.color }}
              ></div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span style={{ color: 'var(--ink-3)' }}>
                Cible : <strong>{kpi.target}</strong>
              </span>
              <span style={{ color: kpi.color }}>
                Top : <strong>{kpi.stretch}</strong>
              </span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function CommandmentsSection() {
  return (
    <div style={{ marginBottom: 36 }}>
      <SectionHeading icon="sparkles" title="Les 10 commandements du commercial Neo" />

      <Card>
        <div className="grid-2">
          {COMMANDMENTS.map((cmd, index) => (
            <div
              key={index}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: 14,
                borderRadius: 'var(--r-md)',
                background: 'var(--paper-2)',
                color: 'var(--ink)',
                border: '1px solid var(--line)',
              }}
            >
              <div
                style={{
                  width: 42,
                  height: 42,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  borderRadius: '50%',
                  background: 'var(--komun-soft)',
                  fontSize: '1.2rem',
                }}
              >
                {cmd.emoji}
              </div>
              <div>
                <span className="pill info" style={{ marginRight: 8 }}>#{index + 1}</span>
                <span style={{ fontWeight: 500, fontSize: 13 }}>{cmd.text}</span>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ═════════════════════════════════════════════
// TAB 4: FORMATION
// ═════════════════════════════════════════════
function TrainingTab() {
  return (
    <div className="training-tab">
      <ProductKnowledgeSection />
      <SalesMethodsSection />
      <QuizSection />
    </div>
  );
}

function ProductKnowledgeSection() {
  return (
    <div style={{ marginBottom: 36 }}>
      <SectionHeading
        icon="boxes"
        title="Connaissance produit"
        sub="Maîtrisez votre catalogue pour répondre à toutes les questions de vos prospects."
      />

      <div className="grid-3">
        {PRODUCTS.map((product, index) => (
          <Card
            key={index}
            head={product.name}
            action={<span style={{ color: 'var(--ink-3)', fontSize: 13 }}>{product.brand}</span>}
          >
            <div className="card-body">
              {/* Price range */}
              <div style={{ marginBottom: 14 }}>
                <span className="pill neutral">
                  <Icon name="receipt" size={13} />
                  {product.priceRange}
                </span>
              </div>

              {/* Selling points */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8, color: 'var(--success-ink)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Icon name="star" size={14} /> Arguments clés
                </div>
                <ul style={{ fontSize: 13, margin: 0, paddingLeft: 18 }}>
                  {product.sellingPoints.map((point, i) => (
                    <li key={i} style={{ marginBottom: 4 }}>{point}</li>
                  ))}
                </ul>
              </div>

              {/* Common questions */}
              <div>
                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8, color: 'var(--komun-ink)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Icon name="help" size={14} /> Questions fréquentes
                </div>
                {product.commonQuestions.map((q, i) => (
                  <p key={i} style={{ fontSize: 13, marginBottom: 4, lineHeight: 1.5 }}>
                    {q}
                  </p>
                ))}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function SalesMethodsSection() {
  return (
    <div style={{ marginBottom: 36 }}>
      <SectionHeading icon="medal" title="Techniques de vente" />

      {/* SPIN Selling */}
      <Card
        head={SALES_TECHNIQUES.spin.title}
        action={<span style={{ color: 'var(--ink-3)', fontSize: 13 }}>— {SALES_TECHNIQUES.spin.subtitle}</span>}
        style={{ marginBottom: 16 }}
      >
        <div className="card-body">
          <div className="grid-2" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
            {SALES_TECHNIQUES.spin.steps.map((step, index) => (
              <div key={index}>
                <div style={{ textAlign: 'center', marginBottom: 8 }}>
                  <span
                    style={{
                      width: 48,
                      height: 48,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: '50%',
                      fontWeight: 700,
                      background: step.color,
                      color: '#fff',
                      fontSize: '1.3rem',
                    }}
                  >
                    {step.letter}
                  </span>
                </div>
                <div style={{ textAlign: 'center', marginBottom: 8 }}>
                  <span style={{ fontWeight: 600 }}>{step.name}</span>
                </div>
                <p style={{ color: 'var(--ink-3)', fontSize: 13, textAlign: 'center', marginBottom: 8 }}>{step.description}</p>
                <div style={{ padding: 10, borderRadius: 'var(--r-sm)', fontSize: 13, background: 'var(--paper-2)', color: 'var(--ink)', border: '1px solid var(--line)' }}>
                  <div style={{ fontWeight: 600, marginBottom: 4, textAlign: 'center', fontSize: '0.75rem', color: step.color }}>
                    Exemples de questions
                  </div>
                  <ul style={{ margin: 0, paddingLeft: 18 }}>
                    {step.examples.map((ex, i) => (
                      <li key={i} style={{ marginBottom: 4 }}>{ex}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* SONCAS */}
      <Card
        head={SALES_TECHNIQUES.soncas.title}
        action={<span style={{ color: 'var(--ink-3)', fontSize: 13 }}>— {SALES_TECHNIQUES.soncas.subtitle}</span>}
        style={{ marginBottom: 16 }}
      >
        <div className="card-body">
          <div className="grid-3">
            {SALES_TECHNIQUES.soncas.profiles.map((profile, index) => (
              <div
                key={index}
                style={{ padding: 14, borderRadius: 'var(--r-md)', height: '100%', background: 'var(--paper-2)', color: 'var(--ink)', border: '1px solid var(--line)' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      background: profile.color,
                      color: '#fff',
                      fontSize: '0.8rem',
                    }}
                  >
                    <i className={`bi ${profile.icon}`}></i>
                  </div>
                  <div>
                    <span style={{ fontWeight: 600 }}>{profile.name}</span>
                    <span style={{ marginLeft: 4, fontWeight: 700, color: profile.color, fontSize: '0.75rem' }}>
                      ({profile.letter})
                    </span>
                  </div>
                </div>
                <p style={{ color: 'var(--ink-3)', fontSize: 13, marginBottom: 8 }}>{profile.description}</p>

                <div style={{ fontSize: 13, marginBottom: 8 }}>
                  <span style={{ fontWeight: 600, fontSize: '0.75rem' }}>Signaux :</span>
                  <ul style={{ margin: 0, paddingLeft: 18, color: 'var(--ink-3)' }}>
                    {profile.signals.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>

                <div
                  style={{ fontSize: 13, padding: 10, borderRadius: 'var(--r-sm)', background: 'var(--card)', color: 'var(--ink)', borderLeft: `3px solid ${profile.color}` }}
                >
                  <Icon name="arrowRight" size={14} style={{ verticalAlign: '-2px', marginRight: 4, color: profile.color }} />
                  {profile.approach}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Closing Techniques */}
      <Card
        head="5 techniques de closing"
        action={<span style={{ color: 'var(--ink-3)', fontSize: 13 }}>— Pour conclure la vente avec confiance</span>}
        style={{ marginBottom: 16 }}
      >
        <div className="card-body">
          <div className="grid-3">
            {SALES_TECHNIQUES.closingTechniques.map((tech, index) => (
              <div
                key={index}
                style={{ padding: 14, borderRadius: 'var(--r-md)', height: '100%', background: 'var(--paper-2)', color: 'var(--ink)', border: '1px solid var(--line)' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <i className={`bi ${tech.icon}`} style={{ color: 'var(--komun)' }}></i>
                  <span style={{ fontWeight: 600 }}>{tech.name}</span>
                </div>
                <p style={{ color: 'var(--ink-3)', fontSize: 13, marginBottom: 8 }}>{tech.description}</p>
                <div
                  style={{ fontSize: 13, padding: 10, borderRadius: 'var(--r-sm)', fontStyle: 'italic', background: 'var(--card)', color: 'var(--ink)', border: '1px solid var(--line)' }}
                >
                  {tech.example}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Active Listening */}
      <Card
        head="L'écoute active"
        action={<span style={{ color: 'var(--ink-3)', fontSize: 13 }}>— La compétence n°1 du commercial</span>}
        style={{ marginBottom: 16 }}
      >
        <div className="card-body">
          <div className="grid-2">
            <div>
              <h6 style={{ fontWeight: 600, fontSize: 13, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Icon name="checkCircle" size={15} style={{ color: 'var(--success)' }} />
                Les bonnes pratiques
              </h6>
              <ul style={{ fontSize: 13 }}>
                <li style={{ marginBottom: 8 }}>
                  <strong>Reformulez</strong> : "Si je comprends bien, vous cherchez..." confirme au client que vous écoutez
                </li>
                <li style={{ marginBottom: 8 }}>
                  <strong>Posez des questions ouvertes</strong> : "Comment..." / "Qu'est-ce qui..." plutôt que des questions fermées
                </li>
                <li style={{ marginBottom: 8 }}>
                  <strong>Prenez des notes</strong> : montrez que chaque détail compte
                </li>
                <li style={{ marginBottom: 8 }}>
                  <strong>Silence</strong> : laissez 3 secondes après chaque réponse, le client complétera souvent
                </li>
                <li style={{ marginBottom: 8 }}>
                  <strong>Langage corporel</strong> : hochez la tête, maintenez le contact visuel
                </li>
              </ul>
            </div>
            <div>
              <h6 style={{ fontWeight: 600, fontSize: 13, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Icon name="x" size={15} style={{ color: 'var(--danger)' }} />
                Les erreurs à éviter
              </h6>
              <ul style={{ fontSize: 13 }}>
                <li style={{ marginBottom: 8 }}>
                  <strong>Couper la parole</strong> : même si vous connaissez déjà la réponse
                </li>
                <li style={{ marginBottom: 8 }}>
                  <strong>Préparer sa réponse</strong> pendant que le client parle
                </li>
                <li style={{ marginBottom: 8 }}>
                  <strong>Parler trop</strong> : le ratio 70/30 est votre boussole
                </li>
                <li style={{ marginBottom: 8 }}>
                  <strong>Juger ou minimiser</strong> : "Ce n'est pas un problème" → interdit !
                </li>
                <li style={{ marginBottom: 8 }}>
                  <strong>Regarder son téléphone</strong> pendant l'échange
                </li>
              </ul>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

function QuizSection() {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<(number | null)[]>(
    new Array(QUIZ_QUESTIONS.length).fill(null)
  );
  const [showResults, setShowResults] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);

  const handleAnswer = (answerIndex: number) => {
    if (selectedAnswers[currentQuestion] !== null) return; // Already answered
    const newAnswers = [...selectedAnswers];
    newAnswers[currentQuestion] = answerIndex;
    setSelectedAnswers(newAnswers);
    setShowExplanation(true);
  };

  const handleNext = () => {
    setShowExplanation(false);
    if (currentQuestion < QUIZ_QUESTIONS.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      setShowResults(true);
    }
  };

  const handleRetry = () => {
    setCurrentQuestion(0);
    setSelectedAnswers(new Array(QUIZ_QUESTIONS.length).fill(null));
    setShowResults(false);
    setShowExplanation(false);
  };

  const score = selectedAnswers.filter(
    (answer, index) => answer === QUIZ_QUESTIONS[index].correct
  ).length;

  const getScoreFeedback = () => {
    const percentage = (score / QUIZ_QUESTIONS.length) * 100;
    if (percentage === 100) return { text: 'Parfait ! Vous êtes un(e) pro de la vente !', color: 'var(--neo-success)', icon: 'bi-trophy' };
    if (percentage >= 80) return { text: 'Excellent ! Vous maîtrisez les fondamentaux.', color: 'var(--neo-success)', icon: 'bi-hand-thumbs-up' };
    if (percentage >= 60) return { text: 'Bien ! Quelques points à revoir.', color: 'var(--neo-warning)', icon: 'bi-emoji-smile' };
    if (percentage >= 40) return { text: 'Pas mal, mais révisez les techniques de vente !', color: 'var(--neo-warning)', icon: 'bi-book' };
    return { text: 'Il faut retravailler les bases. Relisez le guide !', color: 'var(--neo-danger)', icon: 'bi-arrow-repeat' };
  };

  return (
    <div style={{ marginBottom: 36 }}>
      <SectionHeading
        icon="help"
        title="Quiz rapide"
        sub="Testez vos connaissances en technique de vente. 5 questions pour vous évaluer."
      />

      <Card>
        <div className="card-body" style={{ padding: 8 }}>
          {showResults ? (
            /* Results */
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <div
                style={{
                  width: 80,
                  height: 80,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '50%',
                  marginBottom: 14,
                  background: getScoreFeedback().color,
                  color: '#fff',
                  fontSize: '1.5rem',
                }}
              >
                <i className={`bi ${getScoreFeedback().icon}`}></i>
              </div>
              <h4 style={{ fontWeight: 700, marginBottom: 8 }}>
                {score} / {QUIZ_QUESTIONS.length}
              </h4>
              <p style={{ color: 'var(--ink-3)', marginBottom: 22 }}>{getScoreFeedback().text}</p>

              {/* Answer review */}
              <div style={{ textAlign: 'left', marginBottom: 22 }}>
                {QUIZ_QUESTIONS.map((q, index) => {
                  const isCorrect = selectedAnswers[index] === q.correct;
                  return (
                    <div
                      key={index}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 8,
                        marginBottom: 8,
                        padding: 10,
                        borderRadius: 'var(--r-sm)',
                        background: isCorrect ? 'var(--success-soft)' : 'var(--danger-soft)',
                      }}
                    >
                      <Icon
                        name={isCorrect ? 'checkCircle' : 'x'}
                        size={16}
                        style={{ marginTop: 2, color: isCorrect ? 'var(--success)' : 'var(--danger)' }}
                      />
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 500 }}>{q.question}</div>
                        {!isCorrect && (
                          <div style={{ fontSize: 13, color: 'var(--success-ink)', marginTop: 4 }}>
                            Bonne réponse : {q.options[q.correct]}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <Btn icon="activity" onClick={handleRetry}>
                Réessayer
              </Btn>
            </div>
          ) : (
            /* Question */
            <div>
              {/* Progress */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <span style={{ fontSize: 13, color: 'var(--ink-3)' }}>
                  Question {currentQuestion + 1} / {QUIZ_QUESTIONS.length}
                </span>
                <div style={{ display: 'flex', gap: 4 }}>
                  {QUIZ_QUESTIONS.map((_, index) => (
                    <div
                      key={index}
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background:
                          index === currentQuestion
                            ? 'var(--komun)'
                            : index < currentQuestion
                              ? 'var(--success)'
                              : 'var(--line-2)',
                      }}
                    ></div>
                  ))}
                </div>
              </div>

              {/* Progress bar */}
              <div style={{ height: 4, borderRadius: 99, background: 'var(--paper-2)', overflow: 'hidden', marginBottom: 22 }}>
                <div
                  style={{
                    width: `${((currentQuestion + 1) / QUIZ_QUESTIONS.length) * 100}%`,
                    height: '100%',
                    background: 'var(--komun)',
                  }}
                ></div>
              </div>

              {/* Question text */}
              <h6 style={{ fontWeight: 600, marginBottom: 22 }}>{QUIZ_QUESTIONS[currentQuestion].question}</h6>

              {/* Options */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 22 }}>
                {QUIZ_QUESTIONS[currentQuestion].options.map((option, index) => {
                  const isSelected = selectedAnswers[currentQuestion] === index;
                  const isCorrect = index === QUIZ_QUESTIONS[currentQuestion].correct;
                  const hasAnswered = selectedAnswers[currentQuestion] !== null;

                  let borderColor = 'var(--line-2)';
                  let bgColor = 'var(--card)';
                  if (hasAnswered) {
                    if (isCorrect) {
                      borderColor = 'var(--success)';
                      bgColor = 'var(--success-soft)';
                    } else if (isSelected) {
                      borderColor = 'var(--danger)';
                      bgColor = 'var(--danger-soft)';
                    }
                  }

                  return (
                    <button
                      key={index}
                      onClick={() => handleAnswer(index)}
                      disabled={hasAnswered}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        textAlign: 'left',
                        padding: '10px 12px',
                        borderRadius: 'var(--r-sm)',
                        border: `1px solid ${borderColor}`,
                        background: bgColor,
                        color: 'var(--ink)',
                        font: 'inherit',
                        cursor: hasAnswered ? 'default' : 'pointer',
                      }}
                    >
                      <span
                        style={{
                          width: 28,
                          height: 28,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          borderRadius: '50%',
                          fontWeight: 600,
                          fontSize: '0.8rem',
                          background: hasAnswered
                            ? isCorrect
                              ? 'var(--success)'
                              : isSelected
                                ? 'var(--danger)'
                                : 'var(--paper-2)'
                            : 'var(--paper-2)',
                          color: hasAnswered && (isCorrect || isSelected) ? '#fff' : 'var(--ink-3)',
                        }}
                      >
                        {hasAnswered && isCorrect ? (
                          <Icon name="check" size={15} />
                        ) : hasAnswered && isSelected ? (
                          <Icon name="x" size={15} />
                        ) : (
                          String.fromCharCode(65 + index)
                        )}
                      </span>
                      <span style={{ fontSize: 13 }}>{option}</span>
                    </button>
                  );
                })}
              </div>

              {/* Explanation */}
              {showExplanation && (
                <div
                  style={{
                    marginBottom: 14,
                    padding: 14,
                    borderRadius: 'var(--r-md)',
                    background: 'var(--komun-soft)',
                    color: 'var(--ink)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    <Icon name="help" size={16} style={{ marginTop: 2, color: 'var(--komun)' }} />
                    <div style={{ fontSize: 13 }}>{QUIZ_QUESTIONS[currentQuestion].explanation}</div>
                  </div>
                </div>
              )}

              {/* Next button */}
              {showExplanation && (
                <div style={{ textAlign: 'right' }}>
                  <Btn
                    onClick={handleNext}
                    iconRight={currentQuestion < QUIZ_QUESTIONS.length - 1 ? 'arrowRight' : 'check'}
                  >
                    {currentQuestion < QUIZ_QUESTIONS.length - 1 ? 'Suivant' : 'Voir les résultats'}
                  </Btn>
                </div>
              )}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
