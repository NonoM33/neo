import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  UserGamificationProfile,
  Challenge,
  LeaderboardEntry,
  RewardEvent,
  XPActionType,
} from '../types/gamification.types';
import { LEVELS } from '../types/gamification.types';
import type { Lead, Activity, DashboardData } from '../types';
import {
  computeXPFromLeads,
  computeXPFromActivities,
  computeLevel,
  computeStreak,
  computeStats,
  generateChallenges,
  generateMockLeaderboard,
  getXPForAction,
  getActionLabel,
} from '../services/gamification.engine';
import { computeBadges } from '../services/gamification.badges';

interface GamificationState {
  profile: UserGamificationProfile;
  challenges: Challenge[];
  leaderboard: LeaderboardEntry[];
  rewardQueue: RewardEvent[];
  initialized: boolean;

  // Actions
  initialize: (leads: Lead[], activities: Activity[], dashboard: DashboardData | null, userName: string, userInitials: string) => void;
  refresh: (leads: Lead[], activities: Activity[], dashboard: DashboardData | null, userName: string, userInitials: string) => void;
  awardXP: (action: XPActionType, bonusXP?: number) => void;
  addReward: (reward: RewardEvent) => void;
  consumeReward: () => RewardEvent | undefined;
  clearRewards: () => void;
}

const defaultProfile: UserGamificationProfile = {
  totalXP: 0,
  level: LEVELS[0],
  streak: 0,
  longestStreak: 0,
  lastActiveDate: '',
  badges: [],
  stats: {
    leadsCreated: 0,
    leadsWon: 0,
    leadsLost: 0,
    activitiesCompleted: 0,
    callsMade: 0,
    emailsSent: 0,
    meetingsHeld: 0,
    visitsDone: 0,
    totalRevenue: 0,
    dailyLogins: 0,
  },
};

export const useGamificationStore = create<GamificationState>()(
  persist(
    (set, get) => ({
      profile: defaultProfile,
      challenges: [],
      leaderboard: [],
      rewardQueue: [],
      initialized: false,

      initialize: (leads, activities, dashboard, userName, userInitials) => {
        const state = get();

        const leadXP = computeXPFromLeads(leads);
        const activityXP = computeXPFromActivities(activities);
        const totalXP = leadXP + activityXP;
        const level = computeLevel(totalXP);
        const streakData = computeStreak(activities, leads);
        const stats = computeStats(leads, activities);

        const profile: UserGamificationProfile = {
          totalXP,
          level,
          streak: streakData.current,
          longestStreak: streakData.longest,
          lastActiveDate: streakData.lastActive,
          badges: state.profile.badges, // preserve earned badges
          stats,
        };

        // Check for new badges
        const unlockedBadgeIds = computeBadges(profile);
        const existingBadgeIds = new Set(profile.badges.map(b => b.badgeId));
        const newBadges = unlockedBadgeIds.filter(id => !existingBadgeIds.has(id));

        profile.badges = [
          ...profile.badges.map(b => ({ ...b, isNew: false })),
          ...newBadges.map(id => ({
            badgeId: id,
            earnedAt: new Date().toISOString(),
            isNew: true,
          })),
        ];

        const challenges = generateChallenges(profile, dashboard);
        const leaderboard = generateMockLeaderboard(
          userName,
          userInitials,
          totalXP,
          streakData.current,
          stats.leadsWon,
          stats.totalRevenue,
        );

        set({
          profile,
          challenges,
          leaderboard,
          initialized: true,
        });
      },

      refresh: (leads, activities, dashboard, userName, userInitials) => {
        get().initialize(leads, activities, dashboard, userName, userInitials);
      },

      awardXP: (action, bonusXP = 0) => {
        const state = get();
        const xp = getXPForAction(action) + bonusXP;
        const previousLevel = state.profile.level;
        const newTotalXP = state.profile.totalXP + xp;
        const newLevel = computeLevel(newTotalXP);

        // Add XP reward
        const xpReward: RewardEvent = {
          id: `xp-${Date.now()}`,
          type: 'xp_gained',
          data: { xp, action: getActionLabel(action) },
          timestamp: Date.now(),
        };

        const rewards: RewardEvent[] = [xpReward];

        // Level up?
        if (newLevel.tier !== previousLevel.tier) {
          rewards.push({
            id: `level-${Date.now()}`,
            type: 'level_up',
            data: { level: newLevel, previousLevel },
            timestamp: Date.now() + 1,
          });
        }

        // Deal won?
        if (action === 'lead_won') {
          rewards.push({
            id: `deal-${Date.now()}`,
            type: 'deal_won',
            data: { xp },
            timestamp: Date.now() + 2,
          });
        }

        set((s) => ({
          profile: {
            ...s.profile,
            totalXP: newTotalXP,
            level: newLevel,
          },
          rewardQueue: [...s.rewardQueue, ...rewards],
        }));
      },

      addReward: (reward) => {
        set((s) => ({
          rewardQueue: [...s.rewardQueue, reward],
        }));
      },

      consumeReward: () => {
        const state = get();
        if (state.rewardQueue.length === 0) return undefined;
        const [reward, ...rest] = state.rewardQueue;
        set({ rewardQueue: rest });
        return reward;
      },

      clearRewards: () => set({ rewardQueue: [] }),
    }),
    {
      name: 'neo-gamification',
      partialize: (state) => ({
        profile: state.profile,
        initialized: state.initialized,
      }),
    }
  )
);

export default useGamificationStore;
