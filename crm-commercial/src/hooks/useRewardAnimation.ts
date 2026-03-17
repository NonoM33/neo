import { useState, useEffect, useCallback } from 'react';
import { useGamificationStore } from '../stores/gamification.store';
import type { RewardEvent } from '../types/gamification.types';

export function useRewardAnimation() {
  const [currentReward, setCurrentReward] = useState<RewardEvent | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const { rewardQueue, consumeReward } = useGamificationStore();

  const processNext = useCallback(() => {
    if (isAnimating) return;
    const reward = consumeReward();
    if (reward) {
      setCurrentReward(reward);
      setIsAnimating(true);
    }
  }, [isAnimating, consumeReward]);

  useEffect(() => {
    if (rewardQueue.length > 0 && !isAnimating) {
      // Small delay before showing next reward
      const timer = setTimeout(processNext, 300);
      return () => clearTimeout(timer);
    }
  }, [rewardQueue.length, isAnimating, processNext]);

  const dismissReward = useCallback(() => {
    setIsAnimating(false);
    setCurrentReward(null);
  }, []);

  return {
    currentReward,
    isAnimating,
    dismissReward,
    hasRewards: rewardQueue.length > 0,
  };
}
