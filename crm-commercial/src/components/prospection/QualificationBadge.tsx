import { getQualificationCompleteness } from '../../services/scoring.engine';
import type { Lead } from '../../types';

interface QualificationBadgeProps {
  lead: Lead;
}

export function QualificationBadge({ lead }: QualificationBadgeProps) {
  const completeness = getQualificationCompleteness(lead);
  const color = completeness >= 80 ? 'var(--neo-success)'
    : completeness >= 50 ? 'var(--neo-warning)'
    : completeness > 0 ? 'var(--neo-danger)'
    : 'var(--neo-text-muted)';

  if (completeness === 0) {
    return (
      <span style={{
        fontSize: '0.65rem',
        padding: '1px 5px',
        borderRadius: '4px',
        background: 'var(--neo-bg-light)',
        color: 'var(--neo-text-muted)',
      }}>
        Non qualifié
      </span>
    );
  }

  return (
    <span style={{
      fontSize: '0.65rem',
      padding: '1px 5px',
      borderRadius: '4px',
      background: `${color}15`,
      color,
      fontWeight: 600,
    }}>
      Qualif. {completeness}%
    </span>
  );
}

export default QualificationBadge;
