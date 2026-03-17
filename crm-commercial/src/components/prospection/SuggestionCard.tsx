import { useNavigate } from 'react-router-dom';
import type { SmartSuggestion } from '../../types/prospection.types';

interface SuggestionCardProps {
  suggestion: SmartSuggestion;
}

const typeColors: Record<string, string> = {
  warning: 'var(--neo-warning)',
  opportunity: 'var(--neo-success)',
  action: 'var(--neo-primary)',
};

const priorityStyles: Record<string, { bg: string; color: string; label: string }> = {
  high: { bg: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', label: 'Urgent' },
  medium: { bg: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', label: 'Important' },
  low: { bg: 'rgba(108, 117, 125, 0.15)', color: '#6c757d', label: 'Info' },
};

export function SuggestionCard({ suggestion }: SuggestionCardProps) {
  const navigate = useNavigate();
  const typeColor = typeColors[suggestion.type];
  const priority = priorityStyles[suggestion.priority];

  return (
    <div style={{
      padding: '10px 12px',
      borderRadius: '8px',
      background: 'var(--neo-bg-light)',
      borderLeft: `3px solid ${typeColor}`,
      display: 'flex',
      alignItems: 'flex-start',
      gap: '10px',
    }}>
      <i className={`bi ${suggestion.icon}`} style={{
        color: typeColor,
        fontSize: '1rem',
        marginTop: '2px',
        flexShrink: 0,
      }}></i>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="d-flex align-items-start justify-content-between gap-2">
          <p style={{
            margin: 0,
            fontSize: '0.83rem',
            color: 'var(--neo-text-primary)',
            lineHeight: 1.4,
          }}>
            {suggestion.message}
          </p>
          <span style={{
            fontSize: '0.6rem',
            padding: '1px 6px',
            borderRadius: '4px',
            background: priority.bg,
            color: priority.color,
            fontWeight: 600,
            textTransform: 'uppercase',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}>
            {priority.label}
          </span>
        </div>
        {suggestion.actionLabel && suggestion.actionRoute && (
          <button
            className="btn btn-sm mt-1"
            style={{
              fontSize: '0.75rem',
              padding: '2px 10px',
              color: typeColor,
              border: `1px solid ${typeColor}33`,
              borderRadius: '6px',
            }}
            onClick={() => navigate(suggestion.actionRoute!)}
          >
            {suggestion.actionLabel} →
          </button>
        )}
      </div>
    </div>
  );
}

export default SuggestionCard;
