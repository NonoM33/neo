import { AnimatedCounter } from '../ui/AnimatedCounter';

interface QuickStatsProps {
  stats: {
    label: string;
    value: number;
    icon: string;
    color: string;
    prefix?: string;
    suffix?: string;
    formatter?: (v: number) => string;
  }[];
}

export function QuickStats({ stats }: QuickStatsProps) {
  return (
    <div className="row g-3">
      {stats.map((stat, i) => (
        <div key={stat.label} className="col-6 col-xl-3">
          <div
            className="glass-card animate-slide-in-up"
            style={{
              animationDelay: `${i * 0.08}s`,
              padding: '16px',
              textAlign: 'center',
            }}
          >
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: `${stat.color}22`,
              color: stat.color,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 8px',
              fontSize: '1.2rem',
            }}>
              <i className={`bi ${stat.icon}`}></i>
            </div>
            <div style={{
              fontSize: '1.5rem',
              fontWeight: 700,
              color: 'var(--neo-text-primary)',
              lineHeight: 1.2,
            }}>
              <AnimatedCounter
                value={stat.value}
                prefix={stat.prefix}
                suffix={stat.suffix}
                formatter={stat.formatter}
              />
            </div>
            <div style={{
              fontSize: '0.8rem',
              color: 'var(--neo-text-secondary)',
              marginTop: '2px',
            }}>
              {stat.label}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default QuickStats;
