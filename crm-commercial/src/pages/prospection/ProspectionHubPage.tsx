import type { JSX } from 'react';
import { useState, useCallback } from 'react';
import { Card, CardHeader, CardBody } from '../../components';
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
const TABS: { key: TabKey; label: string; icon: string }[] = [
  { key: 'dashboard', label: 'Tableau de bord', icon: 'bi-speedometer2' },
  { key: 'toolkit', label: 'Boîte à outils', icon: 'bi-tools' },
  { key: 'guide', label: 'Guide du commercial', icon: 'bi-book' },
  { key: 'training', label: 'Formation', icon: 'bi-mortarboard' },
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
    <div className="prospection-hub">
      {/* Page Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h5 className="mb-0 fw-semibold">
            <i className="bi bi-rocket-takeoff me-2 text-primary"></i>
            Hub Commercial
          </h5>
          <p className="mb-0 text-secondary small">
            Votre centre de ressources pour performer au quotidien
          </p>
        </div>
      </div>

      {/* Tab Navigation */}
      <ul className="nav nav-pills mb-4 gap-2 flex-wrap">
        {TABS.map((tab) => (
          <li className="nav-item" key={tab.key}>
            <button
              className={`nav-link d-flex align-items-center gap-2 ${activeTab === tab.key ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              <i className={`bi ${tab.icon}`}></i>
              {tab.label}
            </button>
          </li>
        ))}
      </ul>

      {/* Tab Content */}
      {activeTab === 'dashboard' && <DashboardTab />}
      {activeTab === 'toolkit' && <ToolkitTab />}
      {activeTab === 'guide' && <GuideTab />}
      {activeTab === 'training' && <TrainingTab />}
    </div>
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
    <div className="mb-5">
      <h5 className="fw-semibold mb-3">
        <i className="bi bi-telephone me-2 text-primary"></i>
        Scripts téléphoniques
      </h5>
      <p className="text-secondary small mb-3">
        Des trames prêtes à l'emploi pour chaque type d'appel. Adaptez-les à votre style !
      </p>

      <div className="accordion" id="phoneScriptsAccordion">
        {PHONE_SCRIPTS.map((script, index) => (
          <div className="accordion-item border-0 mb-2 rounded-3 overflow-hidden shadow-sm" key={index}>
            <h2 className="accordion-header">
              <button
                className={`accordion-button ${openScript !== index ? 'collapsed' : ''} fw-semibold`}
                type="button"
                onClick={() => setOpenScript(openScript === index ? null : index)}
              >
                <i className={`bi ${script.icon} me-2`} style={{ color: script.color }}></i>
                <span className="me-auto">{script.title}</span>
                <span className="badge text-body-secondary border me-3 fw-normal">
                  <i className="bi bi-clock me-1"></i>
                  {script.duration}
                </span>
              </button>
            </h2>
            <div className={`accordion-collapse collapse ${openScript === index ? 'show' : ''}`}>
              <div className="accordion-body">
                {/* Tips */}
                <div className="alert alert-info border-0 mb-3">
                  <div className="fw-semibold mb-2">
                    <i className="bi bi-lightbulb me-1"></i> Conseils de réussite
                  </div>
                  <ul className="mb-0 small">
                    {script.tips.map((tip, i) => (
                      <li key={i}>{tip}</li>
                    ))}
                  </ul>
                </div>

                {/* Script content */}
                <div className="p-3 rounded-3" style={{ background: 'var(--neo-bg-body)', color: 'var(--neo-text-primary)', border: '1px solid var(--neo-border-color)' }}>
                  <ScriptContent text={script.script} />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ScriptContent({ text }: { text: string }) {
  // Parse markdown-like formatting: **bold**, ==highlight==
  const lines = text.split('\n');

  return (
    <div className="script-content small" style={{ lineHeight: 1.8 }}>
      {lines.map((line, i) => {
        if (!line.trim()) return <br key={i} />;

        // Process bold (**text**) and highlight (==text==)
        let processed = line;
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
                className="px-1 rounded-1"
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
    <div className="mb-5">
      <h5 className="fw-semibold mb-3">
        <i className="bi bi-envelope me-2 text-primary"></i>
        Templates email
      </h5>
      <p className="text-secondary small mb-3">
        Des modèles d'email prêts à personnaliser. Cliquez sur "Copier" pour les utiliser.
      </p>

      <div className="row g-3">
        {EMAIL_TEMPLATES.map((template, index) => (
          <div className="col-lg-6" key={index}>
            <Card className="h-100">
              <CardHeader>
                <div className="d-flex justify-content-between align-items-center">
                  <span>
                    <i className={`bi ${template.icon} me-2 text-primary`}></i>
                    {template.title}
                  </span>
                  <button
                    className={`btn btn-sm ${copiedIndex === index ? 'btn-success' : 'btn-outline-primary'}`}
                    onClick={() => handleCopy(`Objet : ${template.subject}\n\n${template.body}`, index)}
                  >
                    <i className={`bi ${copiedIndex === index ? 'bi-check-lg' : 'bi-clipboard'} me-1`}></i>
                    {copiedIndex === index ? 'Copié !' : 'Copier'}
                  </button>
                </div>
              </CardHeader>
              <CardBody>
                <p className="text-secondary small mb-2">
                  <i className="bi bi-info-circle me-1"></i>
                  {template.context}
                </p>
                <div className="mb-2 p-2 rounded-2" style={{ background: 'var(--neo-bg-body)', color: 'var(--neo-text-primary)', border: '1px solid var(--neo-border-color)' }}>
                  <span className="fw-semibold small text-secondary">Objet :</span>
                  <br />
                  <span className="small fw-medium">{template.subject}</span>
                </div>
                <div
                  className="p-2 rounded-2 small"
                  style={{
                    background: 'var(--neo-bg-body)', color: 'var(--neo-text-primary)', border: '1px solid var(--neo-border-color)',
                    whiteSpace: 'pre-line',
                    maxHeight: '200px',
                    overflowY: 'auto',
                  }}
                >
                  {template.body}
                </div>
              </CardBody>
            </Card>
          </div>
        ))}
      </div>
    </div>
  );
}

function ObjectionHandlingSection() {
  const [openObjection, setOpenObjection] = useState<number | null>(null);

  return (
    <div className="mb-5">
      <h5 className="fw-semibold mb-3">
        <i className="bi bi-shield-exclamation me-2 text-primary"></i>
        Traitement des objections
      </h5>
      <p className="text-secondary small mb-3">
        Les 8 objections les plus courantes et comment y répondre avec assurance.
      </p>

      <div className="row g-3">
        {OBJECTIONS.map((item, index) => (
          <div className="col-lg-6" key={index}>
            <div
              className="card h-100"
              style={{ cursor: 'pointer' }}
              onClick={() => setOpenObjection(openObjection === index ? null : index)}
            >
              <div className="card-body">
                {/* Objection */}
                <div className="d-flex align-items-start gap-2 mb-2">
                  <span
                    className="badge rounded-pill flex-shrink-0"
                    style={{ background: 'var(--neo-danger)', fontSize: '0.7rem' }}
                  >
                    Objection
                  </span>
                  <span className="fw-semibold" style={{ color: 'var(--neo-danger)' }}>
                    "{item.objection}"
                  </span>
                  <i
                    className={`bi bi-chevron-${openObjection === index ? 'up' : 'down'} ms-auto text-secondary`}
                  ></i>
                </div>

                {/* Response (shown when expanded) */}
                {openObjection === index && (
                  <div className="mt-3">
                    <div className="d-flex align-items-start gap-2 mb-2">
                      <span
                        className="badge rounded-pill flex-shrink-0"
                        style={{ background: 'var(--neo-success)', fontSize: '0.7rem' }}
                      >
                        Réponse
                      </span>
                    </div>
                    <p className="small mb-3" style={{ color: 'var(--neo-text-primary)', lineHeight: 1.7 }}>
                      {item.response}
                    </p>

                    <div
                      className="p-2 rounded-2 small"
                      style={{
                        background: 'rgba(13, 110, 253, 0.08)',
                        color: 'var(--neo-primary)',
                        borderLeft: '3px solid var(--neo-primary)',
                      }}
                    >
                      <i className="bi bi-lightbulb me-1"></i>
                      <strong>Astuce :</strong> {item.tip}
                    </div>
                  </div>
                )}
              </div>
            </div>
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
    <div className="mb-5">
      <h5 className="fw-semibold mb-3">
        <i className="bi bi-clock-history me-2 text-primary"></i>
        Ma journée type
      </h5>
      <p className="text-secondary small mb-3">
        L'organisation idéale pour maximiser votre productivité et vos résultats.
      </p>

      <Card>
        <CardBody className="p-4">
          <div className="position-relative">
            {DAILY_ROUTINE.map((item, index) => (
              <div className="d-flex mb-4" key={index}>
                {/* Time column */}
                <div
                  className="text-end me-3 flex-shrink-0 fw-semibold"
                  style={{ width: '60px', color: item.color, fontSize: '0.9rem' }}
                >
                  {item.time}
                </div>

                {/* Timeline dot and line */}
                <div className="d-flex flex-column align-items-center me-3 flex-shrink-0" style={{ width: '24px' }}>
                  <div
                    className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
                    style={{
                      width: '24px',
                      height: '24px',
                      background: item.color,
                      color: '#fff',
                      fontSize: '0.65rem',
                    }}
                  >
                    <i className={`bi ${item.icon}`}></i>
                  </div>
                  {index < DAILY_ROUTINE.length - 1 && (
                    <div
                      className="flex-grow-1"
                      style={{
                        width: '2px',
                        background: 'var(--neo-border-color)',
                        minHeight: '20px',
                      }}
                    ></div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-grow-1 pb-1">
                  <div className="d-flex align-items-center gap-2 mb-1">
                    <span className="fw-semibold">{item.title}</span>
                    <span className="badge text-body-secondary border fw-normal" style={{ fontSize: '0.7rem' }}>
                      {item.duration}
                    </span>
                  </div>
                  <p className="text-secondary small mb-0">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

function PlaybookSection() {
  const [openStage, setOpenStage] = useState<number | null>(null);

  return (
    <div className="mb-5">
      <h5 className="fw-semibold mb-3">
        <i className="bi bi-map me-2 text-primary"></i>
        Playbook par étape
      </h5>
      <p className="text-secondary small mb-3">
        Pour chaque étape du pipeline, les actions à faire et les erreurs à éviter.
      </p>

      <div className="row g-3">
        {PLAYBOOK_STAGES.map((stage, index) => (
          <div className="col-12" key={index}>
            <div
              className="card overflow-hidden"
              style={{ cursor: 'pointer' }}
              onClick={() => setOpenStage(openStage === index ? null : index)}
            >
              <div className="card-body">
                <div className="d-flex align-items-center gap-3">
                  <div
                    className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
                    style={{
                      width: '40px',
                      height: '40px',
                      background: stage.color,
                      color: '#fff',
                    }}
                  >
                    <i className={`bi ${stage.icon}`}></i>
                  </div>
                  <div className="flex-grow-1">
                    <div className="d-flex align-items-center gap-2">
                      <span className="fw-semibold">{stage.stage}</span>
                      <span className="badge text-body-secondary border fw-normal">
                        Objectif : {stage.objective}
                      </span>
                    </div>
                  </div>
                  <i className={`bi bi-chevron-${openStage === index ? 'up' : 'down'} text-secondary`}></i>
                </div>

                {openStage === index && (
                  <div className="row mt-3 g-3">
                    <div className="col-md-6">
                      <div
                        className="p-3 rounded-3 h-100"
                        style={{ background: 'rgba(25, 135, 84, 0.06)', border: '1px solid rgba(25, 135, 84, 0.15)' }}
                      >
                        <div className="fw-semibold mb-2" style={{ color: 'var(--neo-success)' }}>
                          <i className="bi bi-check-circle me-1"></i> À faire
                        </div>
                        <ul className="small mb-0 ps-3">
                          {stage.doList.map((item, i) => (
                            <li key={i} className="mb-1">{item}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div
                        className="p-3 rounded-3 h-100"
                        style={{ background: 'rgba(220, 53, 69, 0.06)', border: '1px solid rgba(220, 53, 69, 0.15)' }}
                      >
                        <div className="fw-semibold mb-2" style={{ color: 'var(--neo-danger)' }}>
                          <i className="bi bi-x-circle me-1"></i> À ne PAS faire
                        </div>
                        <ul className="small mb-0 ps-3">
                          {stage.dontList.map((item, i) => (
                            <li key={i} className="mb-1">{item}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function BenchmarkKPIsSection() {
  return (
    <div className="mb-5">
      <h5 className="fw-semibold mb-3">
        <i className="bi bi-graph-up me-2 text-primary"></i>
        Métriques de référence
      </h5>
      <p className="text-secondary small mb-3">
        Les benchmarks d'un commercial performant chez Neo.
      </p>

      <div className="row g-3">
        {BENCHMARK_KPIS.map((kpi, index) => (
          <div className="col-md-6 col-lg-4" key={index}>
            <Card className="h-100">
              <CardBody>
                <div className="d-flex align-items-center gap-2 mb-3">
                  <div
                    className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
                    style={{
                      width: '36px',
                      height: '36px',
                      background: kpi.color,
                      color: '#fff',
                      fontSize: '0.85rem',
                    }}
                  >
                    <i className={`bi ${kpi.icon}`}></i>
                  </div>
                  <span className="fw-semibold">{kpi.label}</span>
                </div>

                {/* Progress bar */}
                <div className="progress mb-2" style={{ height: '8px' }}>
                  <div
                    className="progress-bar"
                    role="progressbar"
                    style={{ width: `${kpi.percentage}%`, background: kpi.color }}
                  ></div>
                </div>

                <div className="d-flex justify-content-between small">
                  <span className="text-secondary">
                    Cible : <strong>{kpi.target}</strong>
                  </span>
                  <span style={{ color: kpi.color }}>
                    Top : <strong>{kpi.stretch}</strong>
                  </span>
                </div>
              </CardBody>
            </Card>
          </div>
        ))}
      </div>
    </div>
  );
}

function CommandmentsSection() {
  return (
    <div className="mb-5">
      <h5 className="fw-semibold mb-3">
        <i className="bi bi-stars me-2 text-primary"></i>
        Les 10 commandements du commercial Neo
      </h5>

      <Card>
        <CardBody className="p-4">
          <div className="row g-3">
            {COMMANDMENTS.map((cmd, index) => (
              <div className="col-md-6" key={index}>
                <div
                  className="d-flex align-items-center gap-3 p-3 rounded-3"
                  style={{ background: 'var(--neo-bg-body)', color: 'var(--neo-text-primary)', border: '1px solid var(--neo-border-color)' }}
                >
                  <div
                    className="d-flex align-items-center justify-content-center flex-shrink-0 rounded-circle"
                    style={{
                      width: '42px',
                      height: '42px',
                      background: 'var(--neo-primary-light)',
                      fontSize: '1.2rem',
                    }}
                  >
                    {cmd.emoji}
                  </div>
                  <div>
                    <span className="badge bg-primary rounded-pill me-2" style={{ fontSize: '0.65rem' }}>
                      #{index + 1}
                    </span>
                    <span className="fw-medium small">{cmd.text}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardBody>
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
    <div className="mb-5">
      <h5 className="fw-semibold mb-3">
        <i className="bi bi-box-seam me-2 text-primary"></i>
        Connaissance produit
      </h5>
      <p className="text-secondary small mb-3">
        Maîtrisez votre catalogue pour répondre à toutes les questions de vos prospects.
      </p>

      <div className="row g-3">
        {PRODUCTS.map((product, index) => (
          <div className="col-md-6 col-lg-4" key={index}>
            <Card className="h-100">
              <CardHeader>
                <div className="d-flex align-items-center gap-2">
                  <div
                    className="rounded-2 d-flex align-items-center justify-content-center flex-shrink-0"
                    style={{
                      width: '36px',
                      height: '36px',
                      background: product.color,
                      color: '#fff',
                      borderRadius: '8px',
                    }}
                  >
                    <i className={`bi ${product.icon}`}></i>
                  </div>
                  <div>
                    <div className="fw-semibold">{product.name}</div>
                    <div className="text-secondary small">{product.brand}</div>
                  </div>
                </div>
              </CardHeader>
              <CardBody>
                {/* Price range */}
                <div className="mb-3">
                  <span className="badge border fw-normal" style={{ color: 'var(--neo-text-primary)' }}>
                    <i className="bi bi-tag me-1"></i>
                    {product.priceRange}
                  </span>
                </div>

                {/* Selling points */}
                <div className="mb-3">
                  <div className="fw-semibold small mb-2" style={{ color: 'var(--neo-success)' }}>
                    <i className="bi bi-star me-1"></i> Arguments clés
                  </div>
                  <ul className="small mb-0 ps-3">
                    {product.sellingPoints.map((point, i) => (
                      <li key={i} className="mb-1">{point}</li>
                    ))}
                  </ul>
                </div>

                {/* Common questions */}
                <div>
                  <div className="fw-semibold small mb-2" style={{ color: 'var(--neo-primary)' }}>
                    <i className="bi bi-question-circle me-1"></i> Questions fréquentes
                  </div>
                  {product.commonQuestions.map((q, i) => (
                    <p key={i} className="small mb-1" style={{ lineHeight: 1.5 }}>
                      {q}
                    </p>
                  ))}
                </div>
              </CardBody>
            </Card>
          </div>
        ))}
      </div>
    </div>
  );
}

function SalesMethodsSection() {
  return (
    <div className="mb-5">
      <h5 className="fw-semibold mb-3">
        <i className="bi bi-mortarboard me-2 text-primary"></i>
        Techniques de vente
      </h5>

      {/* SPIN Selling */}
      <Card className="mb-4">
        <CardHeader>
          <div>
            <span className="fw-semibold">{SALES_TECHNIQUES.spin.title}</span>
            <span className="text-secondary small ms-2">— {SALES_TECHNIQUES.spin.subtitle}</span>
          </div>
        </CardHeader>
        <CardBody>
          <div className="row g-3">
            {SALES_TECHNIQUES.spin.steps.map((step, index) => (
              <div className="col-md-6 col-lg-3" key={index}>
                <div className="text-center mb-2">
                  <span
                    className="d-inline-flex align-items-center justify-content-center rounded-circle fw-bold"
                    style={{
                      width: '48px',
                      height: '48px',
                      background: step.color,
                      color: '#fff',
                      fontSize: '1.3rem',
                    }}
                  >
                    {step.letter}
                  </span>
                </div>
                <div className="text-center mb-2">
                  <span className="fw-semibold">{step.name}</span>
                </div>
                <p className="text-secondary small text-center mb-2">{step.description}</p>
                <div className="p-2 rounded-2 small" style={{ background: 'var(--neo-bg-body)', color: 'var(--neo-text-primary)', border: '1px solid var(--neo-border-color)' }}>
                  <div className="fw-semibold mb-1 text-center" style={{ fontSize: '0.75rem', color: step.color }}>
                    Exemples de questions
                  </div>
                  <ul className="mb-0 ps-3">
                    {step.examples.map((ex, i) => (
                      <li key={i} className="mb-1">{ex}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>

      {/* SONCAS */}
      <Card className="mb-4">
        <CardHeader>
          <div>
            <span className="fw-semibold">{SALES_TECHNIQUES.soncas.title}</span>
            <span className="text-secondary small ms-2">— {SALES_TECHNIQUES.soncas.subtitle}</span>
          </div>
        </CardHeader>
        <CardBody>
          <div className="row g-3">
            {SALES_TECHNIQUES.soncas.profiles.map((profile, index) => (
              <div className="col-md-6 col-lg-4" key={index}>
                <div
                  className="p-3 rounded-3 h-100"
                  style={{ background: 'var(--neo-bg-body)', color: 'var(--neo-text-primary)', border: '1px solid var(--neo-border-color)' }}
                >
                  <div className="d-flex align-items-center gap-2 mb-2">
                    <div
                      className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
                      style={{
                        width: '32px',
                        height: '32px',
                        background: profile.color,
                        color: '#fff',
                        fontSize: '0.8rem',
                      }}
                    >
                      <i className={`bi ${profile.icon}`}></i>
                    </div>
                    <div>
                      <span className="fw-semibold">{profile.name}</span>
                      <span
                        className="ms-1 fw-bold"
                        style={{ color: profile.color, fontSize: '0.75rem' }}
                      >
                        ({profile.letter})
                      </span>
                    </div>
                  </div>
                  <p className="text-secondary small mb-2">{profile.description}</p>

                  <div className="small mb-2">
                    <span className="fw-semibold" style={{ fontSize: '0.75rem' }}>Signaux :</span>
                    <ul className="mb-0 ps-3 text-secondary">
                      {profile.signals.map((s, i) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ul>
                  </div>

                  <div
                    className="small p-2 rounded-2"
                    style={{ background: 'var(--neo-bg-body)', color: 'var(--neo-text-primary)', borderLeft: `3px solid ${profile.color}` }}
                  >
                    <i className="bi bi-arrow-right me-1" style={{ color: profile.color }}></i>
                    {profile.approach}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>

      {/* Closing Techniques */}
      <Card className="mb-4">
        <CardHeader>
          <span className="fw-semibold">5 techniques de closing</span>
          <span className="text-secondary small ms-2">— Pour conclure la vente avec confiance</span>
        </CardHeader>
        <CardBody>
          <div className="row g-3">
            {SALES_TECHNIQUES.closingTechniques.map((tech, index) => (
              <div className="col-md-6 col-lg-4" key={index}>
                <div
                  className="p-3 rounded-3 h-100"
                  style={{ background: 'var(--neo-bg-body)', color: 'var(--neo-text-primary)', border: '1px solid var(--neo-border-color)' }}
                >
                  <div className="d-flex align-items-center gap-2 mb-2">
                    <i className={`bi ${tech.icon} text-primary`}></i>
                    <span className="fw-semibold">{tech.name}</span>
                  </div>
                  <p className="text-secondary small mb-2">{tech.description}</p>
                  <div
                    className="small p-2 rounded-2 fst-italic"
                    style={{ background: 'var(--neo-bg-body)', color: 'var(--neo-text-primary)', border: '1px solid var(--neo-border-color)' }}
                  >
                    {tech.example}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>

      {/* Active Listening */}
      <Card className="mb-4">
        <CardHeader>
          <span className="fw-semibold">L'écoute active</span>
          <span className="text-secondary small ms-2">— La compétence n°1 du commercial</span>
        </CardHeader>
        <CardBody>
          <div className="row g-3">
            <div className="col-md-6">
              <h6 className="fw-semibold small mb-3">
                <i className="bi bi-check-circle text-success me-1"></i>
                Les bonnes pratiques
              </h6>
              <ul className="small">
                <li className="mb-2">
                  <strong>Reformulez</strong> : "Si je comprends bien, vous cherchez..." confirme au client que vous écoutez
                </li>
                <li className="mb-2">
                  <strong>Posez des questions ouvertes</strong> : "Comment..." / "Qu'est-ce qui..." plutôt que des questions fermées
                </li>
                <li className="mb-2">
                  <strong>Prenez des notes</strong> : montrez que chaque détail compte
                </li>
                <li className="mb-2">
                  <strong>Silence</strong> : laissez 3 secondes après chaque réponse, le client complétera souvent
                </li>
                <li className="mb-2">
                  <strong>Langage corporel</strong> : hochez la tête, maintenez le contact visuel
                </li>
              </ul>
            </div>
            <div className="col-md-6">
              <h6 className="fw-semibold small mb-3">
                <i className="bi bi-x-circle text-danger me-1"></i>
                Les erreurs à éviter
              </h6>
              <ul className="small">
                <li className="mb-2">
                  <strong>Couper la parole</strong> : même si vous connaissez déjà la réponse
                </li>
                <li className="mb-2">
                  <strong>Préparer sa réponse</strong> pendant que le client parle
                </li>
                <li className="mb-2">
                  <strong>Parler trop</strong> : le ratio 70/30 est votre boussole
                </li>
                <li className="mb-2">
                  <strong>Juger ou minimiser</strong> : "Ce n'est pas un problème" → interdit !
                </li>
                <li className="mb-2">
                  <strong>Regarder son téléphone</strong> pendant l'échange
                </li>
              </ul>
            </div>
          </div>
        </CardBody>
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
    <div className="mb-5">
      <h5 className="fw-semibold mb-3">
        <i className="bi bi-patch-question me-2 text-primary"></i>
        Quiz rapide
      </h5>
      <p className="text-secondary small mb-3">
        Testez vos connaissances en technique de vente. 5 questions pour vous évaluer.
      </p>

      <Card>
        <CardBody className="p-4">
          {showResults ? (
            /* Results */
            <div className="text-center py-4">
              <div
                className="d-inline-flex align-items-center justify-content-center rounded-circle mb-3"
                style={{
                  width: '80px',
                  height: '80px',
                  background: getScoreFeedback().color,
                  color: '#fff',
                  fontSize: '1.5rem',
                }}
              >
                <i className={`bi ${getScoreFeedback().icon}`}></i>
              </div>
              <h4 className="fw-bold mb-2">
                {score} / {QUIZ_QUESTIONS.length}
              </h4>
              <p className="text-secondary mb-4">{getScoreFeedback().text}</p>

              {/* Answer review */}
              <div className="text-start mb-4">
                {QUIZ_QUESTIONS.map((q, index) => {
                  const isCorrect = selectedAnswers[index] === q.correct;
                  return (
                    <div
                      key={index}
                      className="d-flex align-items-start gap-2 mb-2 p-2 rounded-2"
                      style={{
                        background: isCorrect
                          ? 'rgba(25, 135, 84, 0.06)'
                          : 'rgba(220, 53, 69, 0.06)',
                      }}
                    >
                      <i
                        className={`bi ${isCorrect ? 'bi-check-circle-fill text-success' : 'bi-x-circle-fill text-danger'} mt-1`}
                      ></i>
                      <div>
                        <div className="small fw-medium">{q.question}</div>
                        {!isCorrect && (
                          <div className="small text-success mt-1">
                            Bonne réponse : {q.options[q.correct]}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <button className="btn btn-primary" onClick={handleRetry}>
                <i className="bi bi-arrow-repeat me-2"></i>
                Réessayer
              </button>
            </div>
          ) : (
            /* Question */
            <div>
              {/* Progress */}
              <div className="d-flex justify-content-between align-items-center mb-3">
                <span className="small text-secondary">
                  Question {currentQuestion + 1} / {QUIZ_QUESTIONS.length}
                </span>
                <div className="d-flex gap-1">
                  {QUIZ_QUESTIONS.map((_, index) => (
                    <div
                      key={index}
                      className="rounded-circle"
                      style={{
                        width: '8px',
                        height: '8px',
                        background:
                          index === currentQuestion
                            ? 'var(--neo-primary)'
                            : index < currentQuestion
                              ? 'var(--neo-success)'
                              : 'var(--neo-border-color)',
                      }}
                    ></div>
                  ))}
                </div>
              </div>

              {/* Progress bar */}
              <div className="progress mb-4" style={{ height: '4px' }}>
                <div
                  className="progress-bar"
                  style={{
                    width: `${((currentQuestion + 1) / QUIZ_QUESTIONS.length) * 100}%`,
                    background: 'var(--neo-primary)',
                  }}
                ></div>
              </div>

              {/* Question text */}
              <h6 className="fw-semibold mb-4">{QUIZ_QUESTIONS[currentQuestion].question}</h6>

              {/* Options */}
              <div className="d-flex flex-column gap-2 mb-4">
                {QUIZ_QUESTIONS[currentQuestion].options.map((option, index) => {
                  const isSelected = selectedAnswers[currentQuestion] === index;
                  const isCorrect = index === QUIZ_QUESTIONS[currentQuestion].correct;
                  const hasAnswered = selectedAnswers[currentQuestion] !== null;

                  let btnClass = 'btn-outline-secondary';
                  if (hasAnswered) {
                    if (isCorrect) btnClass = 'btn-success';
                    else if (isSelected) btnClass = 'btn-danger';
                    else btnClass = 'btn-outline-secondary';
                  }

                  return (
                    <button
                      key={index}
                      className={`btn ${btnClass} text-start d-flex align-items-center gap-2`}
                      onClick={() => handleAnswer(index)}
                      disabled={hasAnswered}
                    >
                      <span
                        className="d-flex align-items-center justify-content-center flex-shrink-0 rounded-circle fw-semibold"
                        style={{
                          width: '28px',
                          height: '28px',
                          fontSize: '0.8rem',
                          background: hasAnswered
                            ? isCorrect
                              ? 'var(--neo-success)'
                              : isSelected
                                ? 'var(--neo-danger)'
                                : 'var(--neo-bg-light)'
                            : 'var(--neo-bg-light)',
                          color: hasAnswered && (isCorrect || isSelected) ? '#fff' : 'var(--neo-text-secondary)',
                        }}
                      >
                        {hasAnswered && isCorrect ? (
                          <i className="bi bi-check"></i>
                        ) : hasAnswered && isSelected ? (
                          <i className="bi bi-x"></i>
                        ) : (
                          String.fromCharCode(65 + index)
                        )}
                      </span>
                      <span className="small">{option}</span>
                    </button>
                  );
                })}
              </div>

              {/* Explanation */}
              {showExplanation && (
                <div
                  className="alert border-0 mb-3"
                  style={{
                    background: 'rgba(13, 110, 253, 0.08)',
                    color: 'var(--neo-text-primary)',
                  }}
                >
                  <div className="d-flex align-items-start gap-2">
                    <i className="bi bi-info-circle text-primary mt-1"></i>
                    <div className="small">{QUIZ_QUESTIONS[currentQuestion].explanation}</div>
                  </div>
                </div>
              )}

              {/* Next button */}
              {showExplanation && (
                <div className="text-end">
                  <button className="btn btn-primary" onClick={handleNext}>
                    {currentQuestion < QUIZ_QUESTIONS.length - 1 ? (
                      <>
                        Suivant
                        <i className="bi bi-arrow-right ms-2"></i>
                      </>
                    ) : (
                      <>
                        Voir les résultats
                        <i className="bi bi-check-all ms-2"></i>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
