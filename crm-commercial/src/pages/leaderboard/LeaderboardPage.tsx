import { useState } from 'react';
import { useGamificationStore } from '../../stores';
import { Avatar, Icon } from '../../components/neo';
import { AnimatedCounter } from '../../components/ui/AnimatedCounter';
import type { LeaderboardEntry } from '../../types/gamification.types';

type Period = 'week' | 'month' | 'all';

const PODIUM_COLOR: Record<number, string> = { 1: '#f59e0b', 2: '#94a3b8', 3: '#cd7f32' };
const PODIUM_MEDAL: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

function formatCurrency(value: number) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(value);
}

export function LeaderboardPage() {
  const { leaderboard } = useGamificationStore();
  const [period, setPeriod] = useState<Period>('month');

  const top3 = leaderboard.slice(0, 3);

  return (
    <div className="leaderboard-page">
      <div className="page-head">
        <div className="ph-l">
          <h1>Classement commercial</h1>
          <p>Qui mène la course ce mois-ci ?</p>
        </div>
        <div className="page-actions">
          <div className="seg">
            <button className={period === 'week' ? 'on' : ''} onClick={() => setPeriod('week')}>
              Semaine
            </button>
            <button className={period === 'month' ? 'on' : ''} onClick={() => setPeriod('month')}>
              Mois
            </button>
            <button className={period === 'all' ? 'on' : ''} onClick={() => setPeriod('all')}>
              All-time
            </button>
          </div>
        </div>
      </div>

      {top3.length > 0 && (
        <div className="podium mb-22">
          {top3.length > 1 && <PodiumCard entry={top3[1]} place={2} />}
          {top3.length > 0 && <PodiumCard entry={top3[0]} place={1} />}
          {top3.length > 2 && <PodiumCard entry={top3[2]} place={3} />}
        </div>
      )}

      <div className="tbl-wrap">
        <table className="tbl">
          <thead>
            <tr>
              <th style={{ width: 64 }}>Rang</th>
              <th>Commercial</th>
              <th>Niveau</th>
              <th style={{ textAlign: 'right' }}>XP</th>
              <th style={{ textAlign: 'center' }}>Série</th>
              <th style={{ textAlign: 'right' }}>Deals</th>
              <th style={{ textAlign: 'right' }}>CA</th>
              <th style={{ width: 40 }} />
            </tr>
          </thead>
          <tbody>
            {leaderboard.map((entry) => (
              <tr
                key={entry.userId}
                style={{
                  background: entry.isCurrentUser ? 'var(--komun-soft)' : undefined,
                }}
              >
                <td>
                  <span
                    style={{
                      fontWeight: 700,
                      fontFamily: 'var(--font-mono)',
                      color: entry.rank <= 3 ? PODIUM_COLOR[entry.rank] : 'var(--ink-3)',
                    }}
                  >
                    {entry.rank <= 3 ? PODIUM_MEDAL[entry.rank] : `#${entry.rank}`}
                  </span>
                </td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                    <Avatar
                      name={entry.name}
                      size={34}
                      tone={entry.isCurrentUser ? 'blue' : 'ink'}
                    />
                    <span className="t-main" style={{ fontWeight: entry.isCurrentUser ? 700 : 600 }}>
                      {entry.isCurrentUser ? `${entry.name} (vous)` : entry.name}
                    </span>
                  </div>
                </td>
                <td>
                  <span
                    style={{
                      fontSize: 12,
                      padding: '3px 10px',
                      borderRadius: 99,
                      background: `${entry.level.color}1f`,
                      color: entry.level.color,
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {entry.level.label}
                  </span>
                </td>
                <td style={{ textAlign: 'right' }}>
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontWeight: 700,
                      color: 'var(--ochre)',
                    }}
                  >
                    <AnimatedCounter value={entry.xp} />
                  </span>
                </td>
                <td style={{ textAlign: 'center' }}>
                  {entry.streak > 0 ? (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        color: 'var(--ochre)',
                        fontWeight: 600,
                      }}
                    >
                      <Icon name="flame" size={14} /> {entry.streak}
                    </span>
                  ) : (
                    <span style={{ color: 'var(--ink-3)' }}>—</span>
                  )}
                </td>
                <td className="t-mono" style={{ textAlign: 'right' }}>
                  {entry.dealsWon}
                </td>
                <td className="t-mono" style={{ textAlign: 'right' }}>
                  {formatCurrency(entry.revenue)}
                </td>
                <td>
                  <TrendArrow trend={entry.trend} />
                </td>
              </tr>
            ))}
            {leaderboard.length === 0 && (
              <tr>
                <td colSpan={8}>
                  <div className="empty">
                    <span className="em-ic">
                      <Icon name="trophy" size={22} />
                    </span>
                    <b>Aucun classement</b>
                    <p>Les performances apparaîtront ici.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TrendArrow({ trend }: { trend: LeaderboardEntry['trend'] }) {
  const color =
    trend === 'up' ? 'var(--success)' : trend === 'down' ? 'var(--danger)' : 'var(--ink-3)';
  const glyph = trend === 'up' ? '▲' : trend === 'down' ? '▼' : '—';
  return <span style={{ color, fontSize: 11 }}>{glyph}</span>;
}

function PodiumCard({ entry, place }: { entry: LeaderboardEntry; place: number }) {
  const color = PODIUM_COLOR[place];
  const isFirst = place === 1;

  return (
    <div
      className="podium-card"
      style={{
        borderColor: `${color}55`,
        transform: isFirst ? 'translateY(-10px)' : undefined,
        padding: isFirst ? '26px 18px' : '20px 18px',
      }}
    >
      <div style={{ fontSize: isFirst ? '2.4rem' : '1.9rem', marginBottom: 6 }}>
        {PODIUM_MEDAL[place]}
      </div>
      <Avatar
        name={entry.name}
        size={isFirst ? 56 : 48}
        tone={entry.isCurrentUser ? 'blue' : 'ochre'}
      />
      <div style={{ fontWeight: 600, fontSize: 14, marginTop: 8 }}>
        {entry.isCurrentUser ? 'Vous' : entry.name}
      </div>
      <div
        style={{
          fontWeight: 700,
          fontSize: 18,
          color: 'var(--ochre)',
          fontFamily: 'var(--font-mono)',
          margin: '4px 0',
        }}
      >
        <AnimatedCounter value={entry.xp} /> XP
      </div>
      <span
        style={{
          fontSize: 11,
          padding: '2px 10px',
          borderRadius: 99,
          background: `${entry.level.color}1f`,
          color: entry.level.color,
          fontWeight: 600,
        }}
      >
        {entry.level.label}
      </span>
    </div>
  );
}

export default LeaderboardPage;
