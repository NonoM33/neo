import { useState } from 'react';
import { BADGE_DEFINITIONS } from '../../services/gamification.badges';
import { useGamificationStore } from '../../stores';
import { BadgeCard } from './BadgeCard';
import type { BadgeCategory, BadgeRarity } from '../../types/gamification.types';

const CATEGORIES: { key: BadgeCategory; label: string; icon: string }[] = [
  { key: 'milestone', label: 'Milestones', icon: 'bi-flag' },
  { key: 'streak', label: 'Streaks', icon: 'bi-fire' },
  { key: 'skill', label: 'Compétences', icon: 'bi-lightning' },
  { key: 'special', label: 'Spéciaux', icon: 'bi-star' },
];

const RARITIES: { key: BadgeRarity | 'all'; label: string }[] = [
  { key: 'all', label: 'Tous' },
  { key: 'common', label: 'Commun' },
  { key: 'rare', label: 'Rare' },
  { key: 'epic', label: 'Épique' },
  { key: 'legendary', label: 'Légendaire' },
];

export function BadgeGrid() {
  const { profile } = useGamificationStore();
  const [selectedCategory, setSelectedCategory] = useState<BadgeCategory | 'all'>('all');
  const [selectedRarity, setSelectedRarity] = useState<BadgeRarity | 'all'>('all');

  const earnedMap = new Map(profile.badges.map(b => [b.badgeId, b]));
  const totalBadges = BADGE_DEFINITIONS.length;
  const earnedCount = profile.badges.length;

  const filteredBadges = BADGE_DEFINITIONS.filter(b => {
    if (selectedCategory !== 'all' && b.category !== selectedCategory) return false;
    if (selectedRarity !== 'all' && b.rarity !== selectedRarity) return false;
    return true;
  });

  return (
    <div>
      {/* Completion progress */}
      <div className="d-flex align-items-center justify-content-between mb-3">
        <span style={{ fontSize: '0.85rem', color: 'var(--neo-text-secondary)' }}>
          {earnedCount}/{totalBadges} badges débloqués
        </span>
        <span style={{
          fontSize: '0.85rem',
          fontWeight: 600,
          color: 'var(--neo-accent)',
        }}>
          {Math.round((earnedCount / totalBadges) * 100)}%
        </span>
      </div>
      <div style={{
        height: '6px',
        borderRadius: '3px',
        background: 'var(--neo-bg-light)',
        marginBottom: '16px',
        overflow: 'hidden',
      }}>
        <div style={{
          height: '100%',
          width: `${(earnedCount / totalBadges) * 100}%`,
          borderRadius: '3px',
          background: 'linear-gradient(90deg, var(--neo-accent), var(--neo-xp-color))',
          transition: 'width 0.5s ease',
        }} />
      </div>

      {/* Filters */}
      <div className="d-flex flex-wrap gap-2 mb-3">
        <button
          className={`btn btn-sm ${selectedCategory === 'all' ? 'btn-primary' : 'btn-outline-secondary'}`}
          onClick={() => setSelectedCategory('all')}
        >
          Tous
        </button>
        {CATEGORIES.map(cat => (
          <button
            key={cat.key}
            className={`btn btn-sm ${selectedCategory === cat.key ? 'btn-primary' : 'btn-outline-secondary'}`}
            onClick={() => setSelectedCategory(cat.key)}
          >
            <i className={`bi ${cat.icon} me-1`}></i>
            {cat.label}
          </button>
        ))}
      </div>

      <div className="d-flex flex-wrap gap-1 mb-3">
        {RARITIES.map(r => (
          <button
            key={r.key}
            className={`btn btn-sm ${selectedRarity === r.key ? 'btn-primary' : 'btn-outline-secondary'}`}
            style={{ fontSize: '0.75rem' }}
            onClick={() => setSelectedRarity(r.key)}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="row g-3">
        {filteredBadges.map(badge => (
          <div key={badge.id} className="col-6 col-md-4 col-lg-3">
            <BadgeCard
              badge={badge}
              earned={earnedMap.get(badge.id)}
            />
          </div>
        ))}
      </div>

      {filteredBadges.length === 0 && (
        <div style={{
          textAlign: 'center',
          padding: '40px',
          color: 'var(--neo-text-muted)',
        }}>
          Aucun badge dans cette catégorie
        </div>
      )}
    </div>
  );
}

export default BadgeGrid;
