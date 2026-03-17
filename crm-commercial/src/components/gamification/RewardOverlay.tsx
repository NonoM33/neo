import { useEffect } from 'react';
import { useRewardAnimation } from '../../hooks/useRewardAnimation';
import { BADGE_RARITY_COLORS } from '../../types/gamification.types';
import { fireConfetti } from './ConfettiEffect';

export function RewardOverlay() {
  const { currentReward, isAnimating, dismissReward } = useRewardAnimation();

  useEffect(() => {
    if (!currentReward) return;

    if (currentReward.type === 'deal_won' || currentReward.type === 'level_up') {
      fireConfetti('celebration');
    }

    const timer = setTimeout(dismissReward, currentReward.type === 'level_up' ? 4000 : 2500);
    return () => clearTimeout(timer);
  }, [currentReward, dismissReward]);

  if (!isAnimating || !currentReward) return null;

  // XP Gained toast
  if (currentReward.type === 'xp_gained') {
    return (
      <div
        className="animate-slide-in-right"
        style={{
          position: 'fixed',
          top: '80px',
          right: '20px',
          zIndex: 9999,
          padding: '12px 20px',
          borderRadius: '12px',
          background: 'var(--neo-bg-card)',
          border: '1px solid var(--neo-xp-color)',
          boxShadow: '0 0 20px rgba(245, 158, 11, 0.2)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          cursor: 'pointer',
        }}
        onClick={dismissReward}
      >
        <span style={{ fontSize: '1.5rem' }}>⚡</span>
        <div>
          <div style={{
            fontWeight: 700,
            color: 'var(--neo-xp-color)',
            fontSize: '1.1rem',
          }}>
            +{currentReward.data.xp} XP
          </div>
          <div style={{
            fontSize: '0.8rem',
            color: 'var(--neo-text-secondary)',
          }}>
            {currentReward.data.action}
          </div>
        </div>
      </div>
    );
  }

  // Level Up
  if (currentReward.type === 'level_up' && currentReward.data.level) {
    const level = currentReward.data.level;
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 10000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(8px)',
        }}
        onClick={dismissReward}
      >
        <div className="animate-scale-in" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '4rem', marginBottom: '16px' }} className="animate-float">
            <i className={`bi ${level.icon}`} style={{ color: level.color }}></i>
          </div>
          <div style={{
            fontSize: '0.9rem',
            color: 'var(--neo-text-secondary)',
            textTransform: 'uppercase',
            letterSpacing: '2px',
            marginBottom: '8px',
          }}>
            Niveau supérieur !
          </div>
          <div style={{
            fontSize: '2.5rem',
            fontWeight: 700,
            color: level.color,
            marginBottom: '8px',
          }}>
            {level.label}
          </div>
          <div style={{
            fontSize: '0.85rem',
            color: 'var(--neo-text-muted)',
          }}>
            Cliquez pour continuer
          </div>
        </div>
      </div>
    );
  }

  // Badge earned
  if (currentReward.type === 'badge_earned' && currentReward.data.badge) {
    const badge = currentReward.data.badge;
    const color = BADGE_RARITY_COLORS[badge.rarity];
    return (
      <div
        className="animate-slide-in-right"
        style={{
          position: 'fixed',
          top: '80px',
          right: '20px',
          zIndex: 9999,
          padding: '16px 20px',
          borderRadius: '12px',
          background: 'var(--neo-bg-card)',
          border: `1px solid ${color}`,
          boxShadow: `0 0 25px ${color}33`,
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          cursor: 'pointer',
          maxWidth: '320px',
        }}
        onClick={dismissReward}
      >
        <div className="animate-badge-reveal" style={{
          width: '48px',
          height: '48px',
          borderRadius: '12px',
          background: `${color}22`,
          color: color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.5rem',
          flexShrink: 0,
        }}>
          <i className={`bi ${badge.icon}`}></i>
        </div>
        <div>
          <div style={{
            fontSize: '0.7rem',
            color,
            textTransform: 'uppercase',
            letterSpacing: '1px',
            marginBottom: '2px',
          }}>
            Badge débloqué
          </div>
          <div style={{
            fontWeight: 700,
            color: 'var(--neo-text-primary)',
          }}>
            {badge.name}
          </div>
          <div style={{
            fontSize: '0.8rem',
            color: 'var(--neo-text-secondary)',
          }}>
            {badge.description}
          </div>
        </div>
      </div>
    );
  }

  // Deal won
  if (currentReward.type === 'deal_won') {
    return (
      <div
        className="animate-slide-in-right"
        style={{
          position: 'fixed',
          top: '80px',
          right: '20px',
          zIndex: 9999,
          padding: '16px 20px',
          borderRadius: '12px',
          background: 'var(--neo-bg-card)',
          border: '1px solid var(--neo-success)',
          boxShadow: '0 0 25px rgba(16, 185, 129, 0.3)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          cursor: 'pointer',
        }}
        onClick={dismissReward}
      >
        <span style={{ fontSize: '2rem' }}>🎉</span>
        <div>
          <div style={{
            fontWeight: 700,
            color: 'var(--neo-success)',
            fontSize: '1.1rem',
          }}>
            Deal gagné !
          </div>
          <div style={{
            fontSize: '0.8rem',
            color: 'var(--neo-xp-color)',
            fontWeight: 600,
          }}>
            +{currentReward.data.xp} XP
          </div>
        </div>
      </div>
    );
  }

  // Streak milestone
  if (currentReward.type === 'streak_milestone') {
    return (
      <div
        className="animate-slide-in-right"
        style={{
          position: 'fixed',
          top: '80px',
          right: '20px',
          zIndex: 9999,
          padding: '12px 20px',
          borderRadius: '12px',
          background: 'var(--neo-bg-card)',
          border: '1px solid var(--neo-streak-color)',
          boxShadow: '0 0 20px rgba(239, 68, 68, 0.2)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          cursor: 'pointer',
        }}
        onClick={dismissReward}
      >
        <span style={{ fontSize: '1.5rem' }} className="animate-flame">🔥</span>
        <div>
          <div style={{
            fontWeight: 700,
            color: 'var(--neo-streak-color)',
          }}>
            Streak de {currentReward.data.streak} jours !
          </div>
          <div style={{
            fontSize: '0.8rem',
            color: 'var(--neo-text-secondary)',
          }}>
            Continuez comme ça !
          </div>
        </div>
      </div>
    );
  }

  return null;
}

export default RewardOverlay;
