import { useGamificationStore } from '../../stores';

export function DailyChallenges() {
  const { challenges } = useGamificationStore();

  const dailyChallenges = challenges.filter(c => c.type === 'daily').slice(0, 3);

  return (
    <div className="glass-card" style={{ padding: '16px' }}>
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h6 style={{ margin: 0, fontWeight: 600, color: 'var(--neo-text-primary)' }}>
          <i className="bi bi-lightning-charge me-1" style={{ color: 'var(--neo-xp-color)' }}></i>
          Défis du jour
        </h6>
        <span style={{
          fontSize: '0.7rem',
          color: 'var(--neo-text-muted)',
        }}>
          {dailyChallenges.filter(c => c.completed).length}/{dailyChallenges.length} complétés
        </span>
      </div>

      <div className="d-flex flex-column gap-2">
        {dailyChallenges.map((challenge, index) => {
          const progress = challenge.target > 0 ? Math.min(challenge.current / challenge.target, 1) : 0;
          return (
            <div
              key={challenge.id}
              className="animate-slide-in-right"
              style={{
                animationDelay: `${index * 0.1}s`,
                padding: '10px 12px',
                borderRadius: '8px',
                background: challenge.completed
                  ? 'rgba(16, 185, 129, 0.1)'
                  : 'var(--neo-bg-light)',
                border: `1px solid ${challenge.completed ? 'rgba(16, 185, 129, 0.2)' : 'transparent'}`,
              }}
            >
              <div className="d-flex align-items-center justify-content-between mb-1">
                <div className="d-flex align-items-center gap-2">
                  <i className={`bi ${challenge.icon}`} style={{
                    color: challenge.completed ? 'var(--neo-success)' : 'var(--neo-text-secondary)',
                    fontSize: '0.9rem',
                  }}></i>
                  <span style={{
                    fontSize: '0.85rem',
                    fontWeight: 500,
                    color: 'var(--neo-text-primary)',
                    textDecoration: challenge.completed ? 'line-through' : 'none',
                    opacity: challenge.completed ? 0.7 : 1,
                  }}>
                    {challenge.title}
                  </span>
                </div>
                <span style={{
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: 'var(--neo-xp-color)',
                }}>
                  +{challenge.xpReward} XP
                </span>
              </div>

              {/* Progress bar */}
              <div style={{
                height: '4px',
                borderRadius: '2px',
                background: 'rgba(255,255,255,0.05)',
                overflow: 'hidden',
              }}>
                <div style={{
                  height: '100%',
                  width: `${progress * 100}%`,
                  borderRadius: '2px',
                  background: challenge.completed
                    ? 'var(--neo-success)'
                    : 'var(--neo-accent)',
                  transition: 'width 0.5s ease',
                }} />
              </div>

              <div style={{
                fontSize: '0.7rem',
                color: 'var(--neo-text-muted)',
                marginTop: '4px',
              }}>
                {challenge.current}/{challenge.target}
              </div>
            </div>
          );
        })}

        {dailyChallenges.length === 0 && (
          <div style={{
            textAlign: 'center',
            padding: '20px',
            color: 'var(--neo-text-muted)',
            fontSize: '0.85rem',
          }}>
            Aucun défi disponible
          </div>
        )}
      </div>
    </div>
  );
}

export default DailyChallenges;
