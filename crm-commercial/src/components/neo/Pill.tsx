import type { ReactNode } from 'react';

export type PillTone =
  | 'neutral'
  | 'info'
  | 'ochre'
  | 'success'
  | 'warning'
  | 'danger'
  | 'dark';

interface PillProps {
  children: ReactNode;
  tone?: PillTone;
  dot?: boolean;
}

const DOT_COLOR: Record<PillTone, string> = {
  neutral: 'var(--ink-3)',
  info: 'var(--komun)',
  ochre: 'var(--ochre)',
  success: 'var(--success)',
  warning: 'var(--warning)',
  danger: 'var(--danger)',
  dark: 'var(--ochre)',
};

export function Pill({ children, tone = 'neutral', dot }: PillProps) {
  return (
    <span className={`pill ${tone}`}>
      {dot && <span className="pd" style={{ background: DOT_COLOR[tone] }} />}
      {children}
    </span>
  );
}
