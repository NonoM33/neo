import type { SmartSuggestion } from '../../types/prospection.types';
import { SuggestionCard } from './SuggestionCard';

interface SuggestionsListProps {
  suggestions: SmartSuggestion[];
  title?: string;
  maxItems?: number;
}

export function SuggestionsList({ suggestions, title = 'Actions suggérées', maxItems }: SuggestionsListProps) {
  const items = maxItems ? suggestions.slice(0, maxItems) : suggestions;

  return (
    <div>
      <h6 style={{ fontWeight: 600, color: 'var(--neo-text-primary)', marginBottom: '12px' }}>
        <i className="bi bi-lightbulb me-2" style={{ color: 'var(--neo-xp-color)' }}></i>
        {title}
      </h6>
      {items.length > 0 ? (
        <div className="d-flex flex-column gap-2">
          {items.map(s => (
            <SuggestionCard key={s.id} suggestion={s} />
          ))}
        </div>
      ) : (
        <div style={{
          textAlign: 'center',
          padding: '20px',
          color: 'var(--neo-text-muted)',
          fontSize: '0.85rem',
        }}>
          <i className="bi bi-check-circle" style={{ fontSize: '1.5rem', display: 'block', marginBottom: '8px', color: 'var(--neo-success)' }}></i>
          Tout est en ordre !
        </div>
      )}
    </div>
  );
}

export default SuggestionsList;
