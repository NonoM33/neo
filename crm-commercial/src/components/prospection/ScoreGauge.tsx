import type { LeadScore } from '../../types/prospection.types';
import { SCORE_LABELS, SCORE_ICONS } from '../../types/prospection.types';

interface ScoreGaugeProps {
  score: LeadScore;
  size?: 'sm' | 'md' | 'lg';
}

export function ScoreGauge({ score, size = 'md' }: ScoreGaugeProps) {
  const dimensions = { sm: 48, md: 80, lg: 120 };
  const dim = dimensions[size];
  const strokeWidth = size === 'sm' ? 3 : size === 'md' ? 5 : 7;
  const radius = (dim - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score.total / 100) * circumference;
  const dashOffset = circumference - progress;

  return (
    <div style={{ textAlign: 'center', display: 'inline-block' }}>
      <div style={{ position: 'relative', width: dim, height: dim }}>
        <svg width={dim} height={dim} style={{ transform: 'rotate(-90deg)' }}>
          {/* Background circle */}
          <circle
            cx={dim / 2}
            cy={dim / 2}
            r={radius}
            fill="none"
            stroke="var(--neo-bg-light)"
            strokeWidth={strokeWidth}
          />
          {/* Progress circle */}
          <circle
            cx={dim / 2}
            cy={dim / 2}
            r={radius}
            fill="none"
            stroke={score.color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            style={{
              transition: 'stroke-dashoffset 1s ease-out',
              filter: `drop-shadow(0 0 4px ${score.color}66)`,
            }}
          />
        </svg>
        {/* Center text */}
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <span style={{
            fontSize: size === 'sm' ? '0.8rem' : size === 'md' ? '1.3rem' : '2rem',
            fontWeight: 700,
            color: score.color,
            lineHeight: 1,
          }}>
            {score.total}
          </span>
        </div>
      </div>
      {size !== 'sm' && (
        <div style={{
          marginTop: '4px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '4px',
        }}>
          <i className={`bi ${SCORE_ICONS[score.label]}`} style={{
            color: score.color,
            fontSize: size === 'md' ? '0.75rem' : '0.9rem',
          }}></i>
          <span style={{
            fontSize: size === 'md' ? '0.75rem' : '0.85rem',
            fontWeight: 600,
            color: score.color,
          }}>
            {SCORE_LABELS[score.label]}
          </span>
        </div>
      )}
    </div>
  );
}

export default ScoreGauge;
