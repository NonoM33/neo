import { useGamificationStore } from '../../stores';
import { computeLevelProgress } from '../../services/gamification.engine';
import { LEVELS } from '../../types/gamification.types';

export function XPProgressBar() {
  const { profile } = useGamificationStore();
  const progress = computeLevelProgress(profile.totalXP);
  const currentLevelIndex = LEVELS.findIndex(l => l.tier === profile.level.tier);
  const nextLevel = currentLevelIndex < LEVELS.length - 1 ? LEVELS[currentLevelIndex + 1] : null;
  const xpToNext = nextLevel ? nextLevel.minXP - profile.totalXP : 0;

  return (
    <div className="glass-card" style={{ padding: '16px 20px' }}>
      <div className="d-flex justify-content-between align-items-center mb-2">
        <div className="d-flex align-items-center gap-2">
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            background: `${profile.level.color}22`,
            color: profile.level.color,
            fontWeight: 700,
            fontSize: '1rem',
          }}>
            <i className={`bi ${profile.level.icon}`}></i>
          </span>
          <div>
            <span style={{ fontWeight: 600, color: profile.level.color, fontSize: '0.9rem' }}>
              {profile.level.label}
            </span>
            <span style={{ color: 'var(--neo-text-muted)', fontSize: '0.8rem', marginLeft: '8px' }}>
              {profile.totalXP.toLocaleString('fr-FR')} XP
            </span>
          </div>
        </div>
        {nextLevel && (
          <div style={{ textAlign: 'right' }}>
            <span style={{ color: 'var(--neo-text-muted)', fontSize: '0.8rem' }}>
              Prochain: <span style={{ color: nextLevel.color, fontWeight: 600 }}>{nextLevel.label}</span>
            </span>
            <div style={{ color: 'var(--neo-text-muted)', fontSize: '0.75rem' }}>
              {xpToNext.toLocaleString('fr-FR')} XP restants
            </div>
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div style={{
        height: '10px',
        borderRadius: '5px',
        background: 'var(--neo-bg-light)',
        overflow: 'hidden',
        position: 'relative',
      }}>
        <div style={{
          height: '100%',
          width: `${progress * 100}%`,
          borderRadius: '5px',
          background: `linear-gradient(90deg, ${profile.level.color}, var(--neo-xp-color))`,
          transition: 'width 0.8s ease',
          position: 'relative',
        }}>
          {/* Shimmer effect */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 2s linear infinite',
          }} />
        </div>
      </div>
    </div>
  );
}

export default XPProgressBar;
