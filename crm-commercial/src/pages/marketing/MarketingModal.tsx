import type { ReactNode } from 'react';

interface MarketingModalProps {
  title: string;
  icon?: string;
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
        background: 'rgba(0,0,0,0.5)',
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
          background: 'var(--neo-bg-card)',
          borderRadius: 12,
          width: '100%',
          maxWidth: size === 'lg' ? 760 : 540,
          boxShadow: '0 10px 40px rgba(0,0,0,0.25)',
        }}
      >
        <div
          className="d-flex align-items-center justify-content-between"
          style={{ padding: '16px 20px', borderBottom: '1px solid var(--neo-border-color)' }}
        >
          <h2 className="mb-0" style={{ fontSize: '1.15rem', fontWeight: 600 }}>
            {icon && <i className={`bi ${icon} me-2`}></i>}
            {title}
          </h2>
          <button
            type="button"
            className="btn-close"
            aria-label="Fermer"
            onClick={onClose}
          ></button>
        </div>
        <div style={{ padding: '20px' }}>{children}</div>
        {footer && (
          <div
            className="d-flex justify-content-end gap-2"
            style={{ padding: '14px 20px', borderTop: '1px solid var(--neo-border-color)' }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export default MarketingModal;
