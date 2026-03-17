import { useGamificationStore } from '../../stores';
import { getBadgeById } from '../../services/gamification.badges';
import { BADGE_RARITY_COLORS } from '../../types/gamification.types';
import { useNavigate } from 'react-router-dom';

export function RecentAchievements() {
  const { profile } = useGamificationStore();
  const navigate = useNavigate();

  const recentBadges = [...profile.badges]
    .sort((a, b) => new Date(b.earnedAt).getTime() - new Date(a.earnedAt).getTime())
    .slice(0, 3)
    .map(earned => ({
      ...earned,
      definition: getBadgeById(earned.badgeId),
    }))
    .filter(b => b.definition);

  return (
    <div className="glass-card" style={{ padding: '16px' }}>
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h6 style={{ margin: 0, fontWeight: 600, color: 'var(--neo-text-primary)' }}>
          <i className="bi bi-award me-1" style={{ color: 'var(--neo-accent)' }}></i>
          Badges récents
        </h6>
        <button
          className="btn btn-sm"
          style={{ fontSize: '0.75rem', color: 'var(--neo-primary)' }}
          onClick={() => navigate('/profile')}
        >
          Voir tout →
        </button>
      </div>

      {recentBadges.length > 0 ? (
        <div className="d-flex flex-column gap-2">
          {recentBadges.map((badge, i) => {
            const def = badge.definition!;
            const rarityColor = BADGE_RARITY_COLORS[def.rarity];
            return (
              <div
                key={badge.badgeId}
                className="d-flex align-items-center gap-3 animate-slide-in-right"
                style={{
                  animationDelay: `${i * 0.1}s`,
                  padding: '8px 10px',
                  borderRadius: '8px',
                  background: 'var(--neo-bg-light)',
                  border: `1px solid ${rarityColor}33`,
                }}
              >
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: `${rarityColor}22`,
                  color: rarityColor,
                  fontSize: '1.1rem',
                  flexShrink: 0,
                }}>
                  <i className={`bi ${def.icon}`}></i>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="d-flex align-items-center gap-1">
                    <span style={{
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      color: 'var(--neo-text-primary)',
                    }}>
                      {def.name}
                    </span>
                    {badge.isNew && (
                      <span style={{
                        fontSize: '0.6rem',
                        padding: '1px 5px',
                        borderRadius: '4px',
                        background: 'var(--neo-accent)',
                        color: '#fff',
                        fontWeight: 600,
                      }}>
                        NEW
                      </span>
                    )}
                  </div>
                  <div style={{
                    fontSize: '0.75rem',
                    color: 'var(--neo-text-muted)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {def.description}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{
          textAlign: 'center',
          padding: '20px',
          color: 'var(--neo-text-muted)',
          fontSize: '0.85rem',
        }}>
          <i className="bi bi-lock" style={{ fontSize: '1.5rem', display: 'block', marginBottom: '8px' }}></i>
          Pas encore de badges
        </div>
      )}
    </div>
  );
}

export default RecentAchievements;
