import type { ReactNode } from 'react';
import { Icon } from '../../components/neo';
import type { IconName } from '../../components/neo';

interface MarketingModalProps {
  title: string;
  icon?: IconName;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'md' | 'lg';
}

/**
 * Modale légère (sans dépendre du JS Bootstrap) réutilisée par les onglets
 * marketing pour les formulaires de création/édition.
 */
export function MarketingModal({ title, icon, onClose, children, footer, size = 'md' }: MarketingModalProps) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,.4)',
        zIndex: 1050,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: '40px 16px',
        overflowY: 'auto',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--paper)',
          border: '1px solid var(--line)',
          borderRadius: 'var(--r-lg)',
          width: '100%',
          maxWidth: size === 'lg' ? 760 : 540,
          boxShadow: '0 10px 40px rgba(0,0,0,.25)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: '1px solid var(--line)',
          }}
        >
          <h2
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              margin: 0,
              fontSize: '1.15rem',
              fontWeight: 600,
              color: 'var(--ink)',
            }}
          >
            {icon && <Icon name={icon} size={18} />}
            {title}
          </h2>
          <button
            type="button"
            className="icon-btn"
            aria-label="Fermer"
            onClick={onClose}
          >
            <Icon name="x" size={16} />
          </button>
        </div>
        <div style={{ padding: 20 }}>{children}</div>
        {footer && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 8,
              padding: '14px 20px',
              borderTop: '1px solid var(--line)',
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export default MarketingModal;
