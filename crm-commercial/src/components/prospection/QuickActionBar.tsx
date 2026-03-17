import { useNavigate } from 'react-router-dom';
import { XPIndicator } from '../gamification/XPIndicator';

interface QuickActionBarProps {
  leadId: string;
}

export function QuickActionBar({ leadId }: QuickActionBarProps) {
  const navigate = useNavigate();

  const actions = [
    {
      label: 'Appel',
      icon: 'bi-telephone',
      xp: 10,
      onClick: () => navigate(`/activities/new?leadId=${leadId}`),
    },
    {
      label: 'Visite',
      icon: 'bi-geo-alt',
      xp: 40,
      onClick: () => navigate(`/activities/new?leadId=${leadId}`),
    },
    {
      label: 'Qualifier',
      icon: 'bi-clipboard-check',
      xp: 30,
      onClick: () => navigate(`/prospection/qualify/${leadId}`),
    },
  ];

  return (
    <div className="d-flex flex-wrap gap-2">
      {actions.map(action => (
        <button
          key={action.label}
          className="btn btn-sm btn-outline-primary d-flex align-items-center gap-1"
          onClick={action.onClick}
          style={{ fontSize: '0.8rem' }}
        >
          <i className={`bi ${action.icon}`}></i>
          {action.label}
          <XPIndicator xp={action.xp} size="sm" />
        </button>
      ))}
    </div>
  );
}

export default QuickActionBar;
