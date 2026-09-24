import { Icon } from './Icon';
import type { IconName } from './icons';
import { sparkPath } from './sparkPath';

export type StatTone = 'ochre' | 'blue' | 'green' | 'ink' | 'danger';

export interface StatCardData {
  key?: string;
  icon: IconName;
  tone: StatTone;
  trend: number;
  val: string | number;
  label: string;
  spark: number[];
  sparkColor: string;
}

export function StatCard({ s }: { s: StatCardData }) {
  const up = s.trend >= 0;
  return (
    <div className="stat">
      <div className="st-top">
        <span className={'st-ic ' + s.tone}>
          <Icon name={s.icon} size={19} />
        </span>
        <span className={'st-trend ' + (up ? 'up' : 'down')}>
          <Icon
            name="arrowRight"
            size={13}
            style={{ transform: up ? 'rotate(-45deg)' : 'rotate(45deg)' }}
          />
          {Math.abs(s.trend)}%
        </span>
      </div>
      <div className="st-val">{s.val}</div>
      <div className="st-label">{s.label}</div>
      <svg className="st-spark" viewBox="0 0 120 34" preserveAspectRatio="none" fill="none">
        <path
          d={sparkPath(s.spark)}
          stroke={s.sparkColor}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}
