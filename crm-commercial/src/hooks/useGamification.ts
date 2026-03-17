import { useCallback } from 'react';
import { useGamificationStore } from '../stores/gamification.store';
import type { XPActionType } from '../types/gamification.types';

export function useGamification() {
  const store = useGamificationStore();

  const awardXP = useCallback(
    (action: XPActionType, bonusXP?: number) => {
      store.awardXP(action, bonusXP);
    },
    [store]
  );

  return {
    profile: store.profile,
    challenges: store.challenges,
    leaderboard: store.leaderboard,
    rewardQueue: store.rewardQueue,
    initialized: store.initialized,
    awardXP,
    consumeReward: store.consumeReward,
    clearRewards: store.clearRewards,
  };
}
