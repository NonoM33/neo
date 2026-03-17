import type { BadgeDefinition, UserGamificationProfile } from '../types/gamification.types';

export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  // === MILESTONE badges ===
  {
    id: 'first-lead',
    name: 'Premier Contact',
    description: 'Créer votre premier lead',
    icon: 'bi-person-plus',
    rarity: 'common',
    category: 'milestone',
    condition: (p) => p.stats.leadsCreated >= 1,
  },
  {
    id: 'leads-10',
    name: 'Chasseur',
    description: 'Créer 10 leads',
    icon: 'bi-people',
    rarity: 'common',
    category: 'milestone',
    condition: (p) => p.stats.leadsCreated >= 10,
  },
  {
    id: 'leads-50',
    name: 'Prospecteur Pro',
    description: 'Créer 50 leads',
    icon: 'bi-people-fill',
    rarity: 'rare',
    category: 'milestone',
    condition: (p) => p.stats.leadsCreated >= 50,
  },
  {
    id: 'leads-100',
    name: 'Machine à Leads',
    description: 'Créer 100 leads',
    icon: 'bi-lightning',
    rarity: 'epic',
    category: 'milestone',
    condition: (p) => p.stats.leadsCreated >= 100,
  },
  {
    id: 'first-win',
    name: 'Première Victoire',
    description: 'Gagner votre premier deal',
    icon: 'bi-trophy',
    rarity: 'common',
    category: 'milestone',
    condition: (p) => p.stats.leadsWon >= 1,
  },
  {
    id: 'wins-5',
    name: 'Closer',
    description: 'Gagner 5 deals',
    icon: 'bi-trophy-fill',
    rarity: 'rare',
    category: 'milestone',
    condition: (p) => p.stats.leadsWon >= 5,
  },
  {
    id: 'wins-20',
    name: 'Deal Machine',
    description: 'Gagner 20 deals',
    icon: 'bi-gem',
    rarity: 'epic',
    category: 'milestone',
    condition: (p) => p.stats.leadsWon >= 20,
  },
  {
    id: 'wins-50',
    name: 'Légende Commerciale',
    description: 'Gagner 50 deals',
    icon: 'bi-stars',
    rarity: 'legendary',
    category: 'milestone',
    condition: (p) => p.stats.leadsWon >= 50,
  },
  {
    id: 'revenue-100k',
    name: 'Club des 100K',
    description: 'Générer 100 000€ de CA',
    icon: 'bi-currency-euro',
    rarity: 'rare',
    category: 'milestone',
    condition: (p) => p.stats.totalRevenue >= 100000,
  },
  {
    id: 'revenue-500k',
    name: 'Demi-Million',
    description: 'Générer 500 000€ de CA',
    icon: 'bi-cash-stack',
    rarity: 'epic',
    category: 'milestone',
    condition: (p) => p.stats.totalRevenue >= 500000,
  },
  {
    id: 'revenue-1m',
    name: 'Millionnaire',
    description: 'Générer 1 000 000€ de CA',
    icon: 'bi-diamond',
    rarity: 'legendary',
    category: 'milestone',
    condition: (p) => p.stats.totalRevenue >= 1000000,
  },
  {
    id: 'xp-1000',
    name: 'Niveau Supérieur',
    description: 'Atteindre 1 000 XP',
    icon: 'bi-arrow-up-circle',
    rarity: 'common',
    category: 'milestone',
    condition: (p) => p.totalXP >= 1000,
  },
  {
    id: 'xp-5000',
    name: 'Vétéran',
    description: 'Atteindre 5 000 XP',
    icon: 'bi-star',
    rarity: 'rare',
    category: 'milestone',
    condition: (p) => p.totalXP >= 5000,
  },
  {
    id: 'xp-25000',
    name: 'Maître du Game',
    description: 'Atteindre 25 000 XP',
    icon: 'bi-star-fill',
    rarity: 'legendary',
    category: 'milestone',
    condition: (p) => p.totalXP >= 25000,
  },

  // === STREAK badges ===
  {
    id: 'streak-3',
    name: 'En Feu',
    description: 'Maintenir un streak de 3 jours',
    icon: 'bi-fire',
    rarity: 'common',
    category: 'streak',
    condition: (p) => p.streak >= 3 || p.longestStreak >= 3,
  },
  {
    id: 'streak-7',
    name: 'Semaine Parfaite',
    description: 'Maintenir un streak de 7 jours',
    icon: 'bi-fire',
    rarity: 'rare',
    category: 'streak',
    condition: (p) => p.streak >= 7 || p.longestStreak >= 7,
  },
  {
    id: 'streak-14',
    name: 'Infatigable',
    description: 'Maintenir un streak de 14 jours',
    icon: 'bi-fire',
    rarity: 'epic',
    category: 'streak',
    condition: (p) => p.streak >= 14 || p.longestStreak >= 14,
  },
  {
    id: 'streak-30',
    name: 'Force de la Nature',
    description: 'Maintenir un streak de 30 jours',
    icon: 'bi-fire',
    rarity: 'legendary',
    category: 'streak',
    condition: (p) => p.streak >= 30 || p.longestStreak >= 30,
  },

  // === SKILL badges ===
  {
    id: 'caller',
    name: 'Accro du Téléphone',
    description: 'Passer 20 appels',
    icon: 'bi-telephone-fill',
    rarity: 'common',
    category: 'skill',
    condition: (p) => p.stats.callsMade >= 20,
  },
  {
    id: 'emailer',
    name: 'Email Master',
    description: 'Envoyer 50 emails',
    icon: 'bi-envelope-fill',
    rarity: 'common',
    category: 'skill',
    condition: (p) => p.stats.emailsSent >= 50,
  },
  {
    id: 'networker',
    name: 'Networker',
    description: 'Participer à 10 réunions',
    icon: 'bi-people-fill',
    rarity: 'rare',
    category: 'skill',
    condition: (p) => p.stats.meetingsHeld >= 10,
  },
  {
    id: 'field-agent',
    name: 'Agent de Terrain',
    description: 'Faire 10 visites',
    icon: 'bi-geo-alt-fill',
    rarity: 'rare',
    category: 'skill',
    condition: (p) => p.stats.visitsDone >= 10,
  },
  {
    id: 'activity-master',
    name: 'Hyperactif',
    description: 'Compléter 50 activités',
    icon: 'bi-lightning-charge',
    rarity: 'rare',
    category: 'skill',
    condition: (p) => p.stats.activitiesCompleted >= 50,
  },
  {
    id: 'activity-legend',
    name: 'Sans Relâche',
    description: 'Compléter 200 activités',
    icon: 'bi-lightning-charge-fill',
    rarity: 'epic',
    category: 'skill',
    condition: (p) => p.stats.activitiesCompleted >= 200,
  },
  {
    id: 'multi-channel',
    name: 'Omnicanal',
    description: 'Utiliser tous les types d\'activités',
    icon: 'bi-grid-3x3-gap',
    rarity: 'rare',
    category: 'skill',
    condition: (p) =>
      p.stats.callsMade > 0 &&
      p.stats.emailsSent > 0 &&
      p.stats.meetingsHeld > 0 &&
      p.stats.visitsDone > 0,
  },

  // === SPECIAL badges ===
  {
    id: 'early-bird',
    name: 'Early Bird',
    description: 'Se connecter pour la première fois',
    icon: 'bi-sunrise',
    rarity: 'common',
    category: 'special',
    condition: (p) => p.stats.dailyLogins >= 1,
  },
  {
    id: 'no-loss',
    name: 'Invincible',
    description: 'Gagner 5 deals sans en perdre',
    icon: 'bi-shield-check',
    rarity: 'epic',
    category: 'special',
    condition: (p) => p.stats.leadsWon >= 5 && p.stats.leadsLost === 0,
  },
  {
    id: 'perfect-ratio',
    name: 'Ratio Parfait',
    description: 'Avoir un taux de conversion > 80% (min 10 deals)',
    icon: 'bi-bullseye',
    rarity: 'legendary',
    category: 'special',
    condition: (p) => {
      const total = p.stats.leadsWon + p.stats.leadsLost;
      return total >= 10 && (p.stats.leadsWon / total) > 0.8;
    },
  },
  {
    id: 'big-deal',
    name: 'Big Deal',
    description: 'Gagner un deal de plus de 50 000€',
    icon: 'bi-cash-coin',
    rarity: 'epic',
    category: 'special',
    condition: (p) => p.stats.totalRevenue >= 50000 && p.stats.leadsWon >= 1,
  },
];

// Compute which badges are unlocked
export function computeBadges(profile: UserGamificationProfile): string[] {
  return BADGE_DEFINITIONS
    .filter(badge => badge.condition(profile))
    .map(badge => badge.id);
}

// Get badge definition by ID
export function getBadgeById(id: string): BadgeDefinition | undefined {
  return BADGE_DEFINITIONS.find(b => b.id === id);
}
