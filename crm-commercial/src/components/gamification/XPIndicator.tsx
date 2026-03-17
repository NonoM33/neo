interface XPIndicatorProps {
  xp: number;
  size?: 'sm' | 'md';
}

export function XPIndicator({ xp, size = 'sm' }: XPIndicatorProps) {
  const fontSize = size === 'sm' ? '0.7rem' : '0.8rem';
  const padding = size === 'sm' ? '1px 6px' : '2px 8px';

  return (
    <span style={{
      fontSize,
      padding,
      borderRadius: '10px',
      background: 'var(--neo-xp-light)',
      color: 'var(--neo-xp-color)',
      fontWeight: 700,
      whiteSpace: 'nowrap',
    }}>
      +{xp} XP
    </span>
  );
}

export default XPIndicator;
