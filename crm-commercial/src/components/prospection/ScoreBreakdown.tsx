import type { ScoreBreakdown as ScoreBreakdownType } from '../../types/prospection.types';

interface ScoreBreakdownProps {
  breakdown: ScoreBreakdownType;
}

const categories = [
  { key: 'profile' as const, label: 'Profil', color: '#3b82f6', icon: 'bi-person' },
  { key: 'budget' as const, label: 'Budget', color: '#10b981', icon: 'bi-currency-euro' },
  { key: 'engagement' as const, label: 'Engagement', color: '#f59e0b', icon: 'bi-activity' },
  { key: 'timing' as const, label: 'Timing', color: '#ef4444', icon: 'bi-clock' },
  { key: 'completeness' as const, label: 'Complétude', color: '#7c3aed', icon: 'bi-clipboard-check' },
];

export function ScoreBreakdown({ breakdown }: ScoreBreakdownProps) {
  return (
    <div className="d-flex flex-column gap-2">
      {categories.map(cat => (
        <div key={cat.key}>
          <div className="d-flex justify-content-between align-items-center mb-1">
            <div className="d-flex align-items-center gap-1">
              <i className={`bi ${cat.icon}`} style={{ color: cat.color, fontSize: '0.75rem' }}></i>
              <span style={{ fontSize: '0.8rem', color: 'var(--neo-text-secondary)' }}>
                {cat.label}
              </span>
            </div>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: cat.color }}>
              {breakdown[cat.key]}/20
            </span>
          </div>
          <div style={{
            height: '6px',
            borderRadius: '3px',
            background: 'var(--neo-bg-light)',
            overflow: 'hidden',
          }}>
            <div style={{
              height: '100%',
              width: `${(breakdown[cat.key] / 20) * 100}%`,
              borderRadius: '3px',
              background: cat.color,
              transition: 'width 0.5s ease',
            }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export default ScoreBreakdown;
