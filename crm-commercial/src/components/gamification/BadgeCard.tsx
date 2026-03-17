import type { BadgeDefinition, EarnedBadge } from '../../types/gamification.types';
import { BADGE_RARITY_COLORS, BADGE_RARITY_LABELS } from '../../types/gamification.types';

interface BadgeCardProps {
  badge: BadgeDefinition;
  earned?: EarnedBadge;
  compact?: boolean;
}

export function BadgeCard({ badge, earned, compact = false }: BadgeCardProps) {
  const isUnlocked = !!earned;
  const rarityColor = BADGE_RARITY_COLORS[badge.rarity];

  if (compact) {
    return (
      <div
        className={isUnlocked ? `glow-${badge.rarity}` : ''}
        style={{
          width: '48px',
          height: '48px',
          borderRadius: '12px',
          background: isUnlocked ? `${rarityColor}22` : 'var(--neo-bg-light)',
          color: isUnlocked ? rarityColor : 'var(--neo-text-muted)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.3rem',
          opacity: isUnlocked ? 1 : 0.4,
          position: 'relative',
          transition: 'transform 0.2s',
          cursor: 'default',
        }}
        title={`${badge.name}${isUnlocked ? '' : ' (Verrouillé)'}\n${badge.description}`}
      >
        <i className={`bi ${badge.icon}`}></i>
        {earned?.isNew && (
          <div style={{
            position: 'absolute',
            top: '-2px',
            right: '-2px',
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            background: 'var(--neo-accent)',
            border: '2px solid var(--neo-bg-card)',
          }} />
        )}
      </div>
    );
  }

  return (
    <div
      className={isUnlocked ? `glow-${badge.rarity}` : ''}
      style={{
        padding: '16px',
        borderRadius: '12px',
        background: isUnlocked ? `${rarityColor}0a` : 'var(--neo-bg-light)',
        border: `1px solid ${isUnlocked ? `${rarityColor}33` : 'var(--neo-border-color)'}`,
        opacity: isUnlocked ? 1 : 0.5,
        textAlign: 'center',
        transition: 'all 0.3s',
        position: 'relative',
      }}
    >
      {earned?.isNew && (
        <span style={{
          position: 'absolute',
          top: '8px',
          right: '8px',
          fontSize: '0.6rem',
          padding: '1px 6px',
          borderRadius: '4px',
          background: 'var(--neo-accent)',
          color: '#fff',
          fontWeight: 600,
        }}>
          NEW
        </span>
      )}

      <div style={{
        width: '56px',
        height: '56px',
        borderRadius: '14px',
        background: isUnlocked ? `${rarityColor}22` : 'var(--neo-bg-body)',
        color: isUnlocked ? rarityColor : 'var(--neo-text-muted)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '1.5rem',
        margin: '0 auto 10px',
      }}>
        {isUnlocked ? (
          <i className={`bi ${badge.icon}`}></i>
        ) : (
          <i className="bi bi-lock"></i>
        )}
      </div>

      <div style={{
        fontWeight: 600,
        fontSize: '0.85rem',
        color: isUnlocked ? 'var(--neo-text-primary)' : 'var(--neo-text-muted)',
        marginBottom: '4px',
      }}>
        {badge.name}
      </div>

      <div style={{
        fontSize: '0.75rem',
        color: 'var(--neo-text-muted)',
        marginBottom: '6px',
        minHeight: '2.2em',
      }}>
        {badge.description}
      </div>

      <span style={{
        fontSize: '0.65rem',
        padding: '2px 8px',
        borderRadius: '4px',
        background: `${rarityColor}22`,
        color: rarityColor,
        fontWeight: 600,
        textTransform: 'uppercase',
      }}>
        {BADGE_RARITY_LABELS[badge.rarity]}
      </span>
    </div>
  );
}

export default BadgeCard;
