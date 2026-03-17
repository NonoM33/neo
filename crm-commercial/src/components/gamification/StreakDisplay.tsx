import { useGamificationStore } from '../../stores';

export function StreakDisplay() {
  const { profile } = useGamificationStore();
  const isActive = profile.streak > 0;
  const isAtRisk = profile.streak > 0 && profile.streak <= 1;

  // Generate heatmap for last 7 days (mock based on streak)
  const days = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
  const heatmap = days.map((day, i) => {
    const isActiveDay = i >= 7 - profile.streak;
    return { day, active: isActiveDay, today: i === 6 };
  });

  return (
    <div className="glass-card" style={{ padding: '16px' }}>
      <div className="d-flex align-items-center justify-content-between mb-3">
        <div className="d-flex align-items-center gap-2">
          <span style={{
            fontSize: '1.5rem',
            filter: isActive ? 'none' : 'grayscale(1)',
          }} className={isActive ? 'animate-flame' : ''}>
            🔥
          </span>
          <div>
            <div style={{
              fontSize: '1.5rem',
              fontWeight: 700,
              color: isActive ? 'var(--neo-streak-color)' : 'var(--neo-text-muted)',
              lineHeight: 1,
            }}>
              {profile.streak}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--neo-text-secondary)' }}>
              jour{profile.streak !== 1 ? 's' : ''} de streak
            </div>
          </div>
        </div>
        {profile.longestStreak > 0 && (
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--neo-text-muted)' }}>Record</div>
            <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--neo-text-secondary)' }}>
              {profile.longestStreak}j
            </div>
          </div>
        )}
      </div>

      {/* 7-day heatmap */}
      <div className="d-flex gap-1 justify-content-between">
        {heatmap.map((d, i) => (
          <div key={i} style={{ textAlign: 'center', flex: 1 }}>
            <div style={{
              fontSize: '0.65rem',
              color: 'var(--neo-text-muted)',
              marginBottom: '4px',
            }}>
              {d.day}
            </div>
            <div style={{
              width: '100%',
              aspectRatio: '1',
              maxWidth: '28px',
              margin: '0 auto',
              borderRadius: '4px',
              background: d.active
                ? `var(--neo-streak-color)`
                : 'var(--neo-bg-light)',
              opacity: d.active ? (d.today ? 1 : 0.6 + (i * 0.05)) : 0.3,
              border: d.today ? '2px solid var(--neo-streak-color)' : 'none',
            }} />
          </div>
        ))}
      </div>

      {isAtRisk && (
        <div style={{
          marginTop: '8px',
          padding: '6px 10px',
          borderRadius: '6px',
          background: 'var(--neo-streak-light)',
          color: 'var(--neo-streak-color)',
          fontSize: '0.75rem',
          textAlign: 'center',
        }}>
          <i className="bi bi-exclamation-triangle me-1"></i>
          Streak à risque ! Complétez une action aujourd'hui
        </div>
      )}
    </div>
  );
}

export default StreakDisplay;
