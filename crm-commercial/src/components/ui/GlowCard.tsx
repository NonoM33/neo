import type { ReactNode, CSSProperties } from 'react';

interface GlowCardProps {
  children: ReactNode;
  glowColor?: string;
  className?: string;
  style?: CSSProperties;
  onClick?: () => void;
}

export function GlowCard({
  children,
  glowColor = 'var(--neo-accent)',
  className = '',
  style,
  onClick,
}: GlowCardProps) {
  return (
    <div
      className={`glow-card-wrapper ${className}`}
      onClick={onClick}
      style={{
        background: 'var(--neo-bg-card)',
        borderRadius: 'var(--neo-radius-md)',
        border: '1px solid var(--neo-border-color)',
        transition: 'all 0.3s ease',
        cursor: onClick ? 'pointer' : 'default',
        ...style,
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget;
        el.style.borderColor = glowColor;
        el.style.boxShadow = `0 0 20px ${glowColor}33, 0 0 40px ${glowColor}11`;
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget;
        el.style.borderColor = 'var(--neo-border-color)';
        el.style.boxShadow = 'none';
      }}
    >
      {children}
    </div>
  );
}

export default GlowCard;
