import { useGamificationStore } from '../../stores';
import { useNavigate } from 'react-router-dom';

export function MiniLeaderboard() {
  const { leaderboard } = useGamificationStore();
  const navigate = useNavigate();
  const top5 = leaderboard.slice(0, 5);
  const currentUser = leaderboard.find(e => e.isCurrentUser);

  return (
    <div className="glass-card" style={{ padding: '16px' }}>
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h6 style={{ margin: 0, fontWeight: 600, color: 'var(--neo-text-primary)' }}>
          <i className="bi bi-trophy me-1" style={{ color: 'var(--neo-xp-color)' }}></i>
          Classement
        </h6>
        <button
          className="btn btn-sm"
          style={{ fontSize: '0.75rem', color: 'var(--neo-primary)' }}
          onClick={() => navigate('/leaderboard')}
        >
          Voir tout →
        </button>
      </div>

      <div className="d-flex flex-column gap-1">
        {top5.map((entry, index) => (
          <div
            key={entry.userId}
            className="animate-slide-in-right"
            style={{
              animationDelay: `${index * 0.05}s`,
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '6px 8px',
              borderRadius: '8px',
              background: entry.isCurrentUser ? 'var(--neo-accent-light)' : 'transparent',
              border: entry.isCurrentUser ? '1px solid var(--neo-accent)' : '1px solid transparent',
            }}
          >
            {/* Rank */}
            <span style={{
              width: '22px',
              textAlign: 'center',
              fontWeight: 700,
              fontSize: '0.85rem',
              color: index === 0 ? '#f59e0b' : index === 1 ? '#94a3b8' : index === 2 ? '#cd7f32' : 'var(--neo-text-muted)',
            }}>
              {index <= 2 ? ['🥇', '🥈', '🥉'][index] : `#${entry.rank}`}
            </span>

            {/* Avatar */}
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              background: entry.isCurrentUser ? 'var(--neo-accent)' : 'var(--neo-bg-light)',
              color: entry.isCurrentUser ? '#fff' : 'var(--neo-text-secondary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.7rem',
              fontWeight: 600,
              flexShrink: 0,
            }}>
              {entry.initials}
            </div>

            {/* Name */}
            <span style={{
              flex: 1,
              fontSize: '0.8rem',
              fontWeight: entry.isCurrentUser ? 600 : 400,
              color: 'var(--neo-text-primary)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {entry.isCurrentUser ? 'Vous' : entry.name}
            </span>

            {/* XP */}
            <span style={{
              fontSize: '0.75rem',
              fontWeight: 600,
              color: 'var(--neo-xp-color)',
            }}>
              {(entry.xp / 1000).toFixed(1)}k
            </span>

            {/* Trend */}
            <i className={`bi bi-arrow-${entry.trend === 'up' ? 'up' : entry.trend === 'down' ? 'down' : 'right'}`}
              style={{
                fontSize: '0.7rem',
                color: entry.trend === 'up' ? 'var(--neo-success)' : entry.trend === 'down' ? 'var(--neo-danger)' : 'var(--neo-text-muted)',
              }}
            ></i>
          </div>
        ))}
      </div>

      {/* Current user if not in top 5 */}
      {currentUser && currentUser.rank > 5 && (
        <>
          <div style={{
            textAlign: 'center',
            padding: '4px',
            color: 'var(--neo-text-muted)',
            fontSize: '0.7rem',
          }}>
            ···
          </div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '6px 8px',
            borderRadius: '8px',
            background: 'var(--neo-accent-light)',
            border: '1px solid var(--neo-accent)',
          }}>
            <span style={{ width: '22px', textAlign: 'center', fontWeight: 700, fontSize: '0.85rem', color: 'var(--neo-text-secondary)' }}>
              #{currentUser.rank}
            </span>
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              background: 'var(--neo-accent)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.7rem',
              fontWeight: 600,
            }}>
              {currentUser.initials}
            </div>
            <span style={{ flex: 1, fontSize: '0.8rem', fontWeight: 600, color: 'var(--neo-text-primary)' }}>
              Vous
            </span>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--neo-xp-color)' }}>
              {(currentUser.xp / 1000).toFixed(1)}k
            </span>
          </div>
        </>
      )}
    </div>
  );
}

export default MiniLeaderboard;
