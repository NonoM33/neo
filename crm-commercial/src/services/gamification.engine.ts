import type { Lead, Activity, DashboardData } from '../types';
import type {
  Level,
  UserGamificationProfile,
  Challenge,
  LeaderboardEntry,
  XPActionType,
} from '../types/gamification.types';
import { LEVELS } from '../types/gamification.types';

// Compute XP from leads based on their status
export function computeXPFromLeads(leads: Lead[]): number {
  let xp = 0;
  for (const lead of leads) {
    xp += 15; // lead_created
    switch (lead.status) {
      case 'qualifie':
        xp += 25;
        break;
      case 'proposition':
        xp += 25 + 50;
        break;
      case 'negociation':
        xp += 25 + 50 + 75;
        break;
      case 'gagne':
        xp += 25 + 50 + 75 + 200;
        // Bonus for high-value deals
        if (lead.estimatedValue) {
          const value = parseFloat(lead.estimatedValue);
          if (value >= 50000) xp += 100;
          else if (value >= 20000) xp += 50;
          else if (value >= 10000) xp += 25;
        }
        break;
      case 'perdu':
        xp += 25; // at least qualified
        break;
    }
  }
  return xp;
}

// Compute XP from activities
// Only non-canceled activities earn creation XP, and type-specific XP requires completion
export function computeXPFromActivities(activities: Activity[]): number {
  let xp = 0;
  for (const activity of activities) {
    // Canceled activities earn nothing
    if (activity.status === 'annule') continue;

    xp += 5; // activity_created (only if not canceled)

    if (activity.status === 'termine') {
      xp += 10; // activity_completed
      // Type-specific bonus only on completion
      switch (activity.type) {
        case 'appel':
          xp += 10;
          break;
        case 'email':
          xp += 5;
          break;
        case 'reunion':
          xp += 50;
          break;
        case 'visite':
          xp += 40;
          break;
      }
    }
  }
  return xp;
}

// Compute level from total XP
export function computeLevel(totalXP: number): Level {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (totalXP >= LEVELS[i].minXP) {
      return LEVELS[i];
    }
  }
  return LEVELS[0];
}

// Get XP progress within current level (0-1)
export function computeLevelProgress(totalXP: number): number {
  const level = computeLevel(totalXP);
  if (level.maxXP === Infinity) return 1;
  const xpInLevel = totalXP - level.minXP;
  const levelRange = level.maxXP - level.minXP + 1;
  return Math.min(xpInLevel / levelRange, 1);
}

// Compute streak from activities and leads (consecutive active days)
// Only completed activities count toward streaks (prevent cancel-farming)
export function computeStreak(activities: Activity[], leads: Lead[]): { current: number; longest: number; lastActive: string } {
  const activeDates = new Set<string>();

  for (const a of activities) {
    if (a.status === 'annule') continue; // canceled activities don't count
    const date = a.completedAt || a.createdAt;
    if (date) activeDates.add(date.split('T')[0]);
  }
  for (const l of leads) {
    if (l.createdAt) activeDates.add(l.createdAt.split('T')[0]);
    if (l.updatedAt) activeDates.add(l.updatedAt.split('T')[0]);
  }

  const sorted = Array.from(activeDates).sort().reverse();
  if (sorted.length === 0) return { current: 0, longest: 0, lastActive: '' };

  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  // Current streak: must include today or yesterday
  let currentStreak = 0;
  if (sorted[0] === today || sorted[0] === yesterday) {
    currentStreak = 1;
    for (let i = 1; i < sorted.length; i++) {
      const prev = new Date(sorted[i - 1]);
      const curr = new Date(sorted[i]);
      const diff = (prev.getTime() - curr.getTime()) / 86400000;
      if (diff === 1) {
        currentStreak++;
      } else {
        break;
      }
    }
  }

  // Longest streak
  let longestStreak = 1;
  let streak = 1;
  const allSorted = Array.from(activeDates).sort();
  for (let i = 1; i < allSorted.length; i++) {
    const prev = new Date(allSorted[i - 1]);
    const curr = new Date(allSorted[i]);
    const diff = (curr.getTime() - prev.getTime()) / 86400000;
    if (diff === 1) {
      streak++;
      longestStreak = Math.max(longestStreak, streak);
    } else {
      streak = 1;
    }
  }

  return {
    current: currentStreak,
    longest: Math.max(longestStreak, currentStreak),
    lastActive: sorted[0],
  };
}

// Compute stats from leads and activities (excludes canceled activities)
export function computeStats(leads: Lead[], activities: Activity[]) {
  const activeActivities = activities.filter(a => a.status !== 'annule');
  return {
    leadsCreated: leads.length,
    leadsWon: leads.filter(l => l.status === 'gagne').length,
    leadsLost: leads.filter(l => l.status === 'perdu').length,
    activitiesCompleted: activities.filter(a => a.status === 'termine').length,
    callsMade: activeActivities.filter(a => a.type === 'appel' && a.status === 'termine').length,
    emailsSent: activeActivities.filter(a => a.type === 'email' && a.status === 'termine').length,
    meetingsHeld: activeActivities.filter(a => a.type === 'reunion' && a.status === 'termine').length,
    visitsDone: activeActivities.filter(a => a.type === 'visite' && a.status === 'termine').length,
    totalRevenue: leads
      .filter(l => l.status === 'gagne' && l.estimatedValue)
      .reduce((sum, l) => sum + parseFloat(l.estimatedValue!), 0),
    dailyLogins: 1,
  };
}

// Generate daily/weekly challenges
export function generateChallenges(
  profile: UserGamificationProfile,
  _dashboard: DashboardData | null
): Challenge[] {
  const now = new Date();
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);
  const endOfWeek = new Date(now);
  endOfWeek.setDate(endOfWeek.getDate() + (7 - endOfWeek.getDay()));
  endOfWeek.setHours(23, 59, 59, 999);

  const challenges: Challenge[] = [
    {
      id: 'daily-calls',
      type: 'daily',
      title: 'Passez 3 appels',
      description: 'Loguez 3 appels aujourd\'hui',
      icon: 'bi-telephone',
      target: 3,
      current: Math.min(profile.stats.callsMade, 3),
      xpReward: 50,
      expiresAt: endOfDay.toISOString(),
      completed: profile.stats.callsMade >= 3,
    },
    {
      id: 'daily-activities',
      type: 'daily',
      title: 'Complétez 2 activités',
      description: 'Terminez 2 activités aujourd\'hui',
      icon: 'bi-check-circle',
      target: 2,
      current: Math.min(profile.stats.activitiesCompleted % 5, 2),
      xpReward: 50,
      expiresAt: endOfDay.toISOString(),
      completed: false,
    },
    {
      id: 'daily-lead',
      type: 'daily',
      title: 'Créez un lead',
      description: 'Ajoutez un nouveau prospect',
      icon: 'bi-person-plus',
      target: 1,
      current: 0,
      xpReward: 50,
      expiresAt: endOfDay.toISOString(),
      completed: false,
    },
  ];

  return challenges;
}

// Generate mock leaderboard with simulated competitors
export function generateMockLeaderboard(
  userName: string,
  userInitials: string,
  userXP: number,
  userStreak: number,
  userDeals: number,
  userRevenue: number
): LeaderboardEntry[] {
  const mockUsers = [
    { name: 'Sophie Martin', initials: 'SM', baseXP: 18500, streak: 12, deals: 28, revenue: 450000 },
    { name: 'Thomas Bernard', initials: 'TB', baseXP: 15200, streak: 8, deals: 22, revenue: 380000 },
    { name: 'Julie Dupont', initials: 'JD', baseXP: 12800, streak: 15, deals: 18, revenue: 320000 },
    { name: 'Marc Leroy', initials: 'ML', baseXP: 9500, streak: 5, deals: 14, revenue: 250000 },
    { name: 'Emma Petit', initials: 'EP', baseXP: 7200, streak: 3, deals: 10, revenue: 180000 },
    { name: 'Lucas Moreau', initials: 'LM', baseXP: 5800, streak: 2, deals: 8, revenue: 140000 },
    { name: 'Camille Roux', initials: 'CR', baseXP: 4100, streak: 1, deals: 5, revenue: 90000 },
  ];

  const allEntries = [
    ...mockUsers.map(u => ({
      userId: u.name.toLowerCase().replace(/\s/g, '-'),
      name: u.name,
      initials: u.initials,
      xp: u.baseXP,
      level: computeLevel(u.baseXP),
      streak: u.streak,
      dealsWon: u.deals,
      revenue: u.revenue,
      isCurrentUser: false,
    })),
    {
      userId: 'current',
      name: userName,
      initials: userInitials,
      xp: userXP,
      level: computeLevel(userXP),
      streak: userStreak,
      dealsWon: userDeals,
      revenue: userRevenue,
      isCurrentUser: true,
    },
  ];

  // Sort by XP descending
  allEntries.sort((a, b) => b.xp - a.xp);

  return allEntries.map((entry, index) => ({
    ...entry,
    rank: index + 1,
    trend: entry.isCurrentUser ? 'up' as const : (['up', 'down', 'stable'] as const)[index % 3],
  }));
}

// XP for specific action type
export function getXPForAction(action: XPActionType): number {
  const values: Record<XPActionType, number> = {
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
  return values[action] || 0;
}

// Human-readable action label
export function getActionLabel(action: XPActionType): string {
  const labels: Record<XPActionType, string> = {
    lead_created: 'Lead créé',
    lead_qualified: 'Lead qualifié',
    lead_proposition: 'Proposition envoyée',
    lead_negociation: 'En négociation',
    lead_won: 'Deal gagné !',
    activity_created: 'Activité créée',
    activity_completed: 'Activité terminée',
    call_logged: 'Appel logué',
    email_logged: 'Email logué',
    meeting_booked: 'Réunion bookée',
    visit_done: 'Visite effectuée',
    daily_login: 'Connexion quotidienne',
    streak_bonus: 'Bonus streak',
    challenge_completed: 'Challenge complété',
    lead_qualification_completed: 'Qualification complétée',
    qualification_wizard_started: 'Qualification démarrée',
    appointment_created: 'RDV créé',
    appointment_confirmed: 'RDV confirmé',
    appointment_completed: 'RDV terminé',
    weekly_appointments_5: '5 RDV dans la semaine',
  };
  return labels[action] || action;
}
