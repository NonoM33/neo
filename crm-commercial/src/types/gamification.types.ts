// XP Action Types
export type XPActionType =
  | 'lead_created'
  | 'lead_qualified'
  | 'lead_proposition'
  | 'lead_negociation'
  | 'lead_won'
  | 'activity_created'
  | 'activity_completed'
  | 'call_logged'
  | 'email_logged'
  | 'meeting_booked'
  | 'visit_done'
  | 'daily_login'
  | 'streak_bonus'
  | 'challenge_completed'
  | 'lead_qualification_completed'
  | 'qualification_wizard_started'
  | 'appointment_created'
  | 'appointment_confirmed'
  | 'appointment_completed'
  | 'weekly_appointments_5';

// XP values per action
export const XP_VALUES: Record<XPActionType, number> = {
  lead_created: 15,
  lead_qualified: 25,
  lead_proposition: 50,
  lead_negociation: 75,
  lead_won: 200,
  activity_created: 5,
  activity_completed: 10,
  call_logged: 10,
  email_logged: 5,
  meeting_booked: 50,
  visit_done: 40,
  daily_login: 5,
  streak_bonus: 10,
  challenge_completed: 50,
  lead_qualification_completed: 30,
  qualification_wizard_started: 5,
  appointment_created: 10,
  appointment_confirmed: 5,
  appointment_completed: 30,
  weekly_appointments_5: 50,
};

// Level tiers
export type LevelTier = 'stagiaire' | 'junior' | 'confirme' | 'senior' | 'expert' | 'directeur';

export interface Level {
  tier: LevelTier;
  label: string;
  minXP: number;
  maxXP: number;
  icon: string;
  color: string;
}

export const LEVELS: Level[] = [
  { tier: 'stagiaire', label: 'Stagiaire', minXP: 0, maxXP: 499, icon: 'bi-mortarboard', color: '#6c757d' },
  { tier: 'junior', label: 'Junior', minXP: 500, maxXP: 1999, icon: 'bi-person', color: '#0dcaf0' },
  { tier: 'confirme', label: 'Confirmé', minXP: 2000, maxXP: 4999, icon: 'bi-person-check', color: '#0d6efd' },
  { tier: 'senior', label: 'Senior', minXP: 5000, maxXP: 11999, icon: 'bi-star', color: '#7c3aed' },
  { tier: 'expert', label: 'Expert', minXP: 12000, maxXP: 24999, icon: 'bi-trophy', color: '#f59e0b' },
  { tier: 'directeur', label: 'Directeur', minXP: 25000, maxXP: Infinity, icon: 'bi-gem', color: '#ef4444' },
];

// Badge system
export type BadgeRarity = 'common' | 'rare' | 'epic' | 'legendary';

export const BADGE_RARITY_LABELS: Record<BadgeRarity, string> = {
  common: 'Commun',
  rare: 'Rare',
  epic: 'Épique',
  legendary: 'Légendaire',
};

export const BADGE_RARITY_COLORS: Record<BadgeRarity, string> = {
  common: '#6c757d',
  rare: '#0d6efd',
  epic: '#7c3aed',
  legendary: '#f59e0b',
};

export type BadgeCategory = 'milestone' | 'streak' | 'skill' | 'special';

export interface BadgeDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: BadgeRarity;
  category: BadgeCategory;
  condition: (profile: UserGamificationProfile) => boolean;
}

export interface EarnedBadge {
  badgeId: string;
  earnedAt: string;
  isNew?: boolean;
}

// User gamification profile
export interface UserGamificationProfile {
  totalXP: number;
  level: Level;
  streak: number;
  longestStreak: number;
  lastActiveDate: string;
  badges: EarnedBadge[];
  stats: {
    leadsCreated: number;
    leadsWon: number;
    leadsLost: number;
    activitiesCompleted: number;
    callsMade: number;
    emailsSent: number;
    meetingsHeld: number;
    visitsDone: number;
    totalRevenue: number;
    dailyLogins: number;
  };
}

// Challenges
export type ChallengeType = 'daily' | 'weekly';

export interface Challenge {
  id: string;
  type: ChallengeType;
  title: string;
  description: string;
  icon: string;
  target: number;
  current: number;
  xpReward: number;
  expiresAt: string;
  completed: boolean;
}

// Leaderboard
export interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  initials: string;
  xp: number;
  level: Level;
  streak: number;
  dealsWon: number;
  revenue: number;
  trend: 'up' | 'down' | 'stable';
  isCurrentUser: boolean;
}

// Reward events (animation queue)
export type RewardEventType = 'xp_gained' | 'level_up' | 'badge_earned' | 'deal_won' | 'streak_milestone' | 'challenge_completed';

export interface RewardEvent {
  id: string;
  type: RewardEventType;
  data: {
    xp?: number;
    action?: string;
    level?: Level;
    previousLevel?: Level;
    badge?: BadgeDefinition;
    dealValue?: number;
    streak?: number;
    challenge?: Challenge;
  };
  timestamp: number;
}
