import type { DesiredService } from '../../types/prospection.types';
import { DESIRED_SERVICE_LABELS, DESIRED_SERVICE_ICONS, DESIRED_SERVICE_COLORS } from '../../types/prospection.types';

interface ServiceSelectorProps {
  selected: DesiredService[];
  onChange: (services: DesiredService[]) => void;
}

const ALL_SERVICES: DesiredService[] = ['securite', 'energie', 'confort', 'multimedia', 'jardin'];

export function ServiceSelector({ selected, onChange }: ServiceSelectorProps) {
  const toggle = (service: DesiredService) => {
    if (selected.includes(service)) {
      onChange(selected.filter(s => s !== service));
    } else {
      onChange([...selected, service]);
    }
  };

  return (
    <div className="row g-2">
      {ALL_SERVICES.map(service => {
        const isSelected = selected.includes(service);
        const color = DESIRED_SERVICE_COLORS[service];
        return (
          <div key={service} className="col-6 col-md-4">
            <div
              onClick={() => toggle(service)}
              style={{
                padding: '16px 12px',
                borderRadius: '10px',
                border: `2px solid ${isSelected ? color : 'var(--neo-border-color)'}`,
                background: isSelected ? `${color}15` : 'var(--neo-bg-light)',
                cursor: 'pointer',
                textAlign: 'center',
                transition: 'all 0.2s ease',
                boxShadow: isSelected ? `0 0 15px ${color}22` : 'none',
              }}
            >
              <i className={`bi ${DESIRED_SERVICE_ICONS[service]}`} style={{
                fontSize: '1.5rem',
                color: isSelected ? color : 'var(--neo-text-muted)',
                display: 'block',
                marginBottom: '6px',
                transition: 'color 0.2s',
              }}></i>
              <span style={{
                fontSize: '0.85rem',
                fontWeight: isSelected ? 600 : 400,
                color: isSelected ? color : 'var(--neo-text-secondary)',
              }}>
                {DESIRED_SERVICE_LABELS[service]}
              </span>
              {isSelected && (
                <div style={{
                  marginTop: '6px',
                }}>
                  <i className="bi bi-check-circle-fill" style={{ color, fontSize: '0.9rem' }}></i>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default ServiceSelector;
