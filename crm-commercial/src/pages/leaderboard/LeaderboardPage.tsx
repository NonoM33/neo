import { useState } from 'react';
import { useGamificationStore } from '../../stores';
import { Card, CardBody } from '../../components';
import { AnimatedCounter } from '../../components/ui/AnimatedCounter';
import type { LeaderboardEntry } from '../../types/gamification.types';

type Period = 'week' | 'month' | 'all';

export function LeaderboardPage() {
  const { leaderboard } = useGamificationStore();
  const [period, setPeriod] = useState<Period>('month');

  const top3 = leaderboard.slice(0, 3);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value);

  return (
    <div className="leaderboard-page">
      {/* Period Selector */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h5 style={{ margin: 0, fontWeight: 600 }}>
          <i className="bi bi-trophy me-2" style={{ color: 'var(--neo-xp-color)' }}></i>
          Classement commercial
        </h5>
        <div className="btn-group">
          <button className={`btn btn-sm ${period === 'week' ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={() => setPeriod('week')}>
            Semaine
          </button>
          <button className={`btn btn-sm ${period === 'month' ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={() => setPeriod('month')}>
            Mois
          </button>
          <button className={`btn btn-sm ${period === 'all' ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={() => setPeriod('all')}>
            All-time
          </button>
        </div>
      </div>

      {/* Podium Top 3 */}
      <div className="row g-3 mb-4 justify-content-center">
        {/* 2nd place */}
        {top3.length > 1 && (
          <div className="col-md-3 order-md-1 order-2">
            <PodiumCard entry={top3[1]} place={2} />
          </div>
        )}
        {/* 1st place */}
        {top3.length > 0 && (
          <div className="col-md-4 order-md-2 order-1">
            <PodiumCard entry={top3[0]} place={1} />
          </div>
        )}
        {/* 3rd place */}
        {top3.length > 2 && (
          <div className="col-md-3 order-md-3 order-3">
            <PodiumCard entry={top3[2]} place={3} />
          </div>
        )}
      </div>

      {/* Full Table */}
      <Card>
        <CardBody className="p-0">
          <div className="table-responsive">
            <table className="table table-hover mb-0">
              <thead>
                <tr>
                  <th style={{ width: '60px' }}>Rang</th>
                  <th>Commercial</th>
                  <th>Niveau</th>
                  <th style={{ textAlign: 'right' }}>XP</th>
                  <th style={{ textAlign: 'center' }}>Streak</th>
                  <th style={{ textAlign: 'right' }}>Deals</th>
                  <th style={{ textAlign: 'right' }}>CA</th>
                  <th style={{ width: '40px' }}></th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((entry) => (
                  <tr
                    key={entry.userId}
                    style={{
                      background: entry.isCurrentUser ? 'var(--neo-accent-light)' : undefined,
                      fontWeight: entry.isCurrentUser ? 600 : undefined,
                    }}
                  >
                    <td>
                      <span style={{
                        fontWeight: 700,
                        color: entry.rank <= 3
                          ? ['#f59e0b', '#94a3b8', '#cd7f32'][entry.rank - 1]
                          : 'var(--neo-text-muted)',
                      }}>
                        {entry.rank <= 3 ? ['🥇', '🥈', '🥉'][entry.rank - 1] : `#${entry.rank}`}
                      </span>
                    </td>
                    <td>
                      <div className="d-flex align-items-center gap-2">
                        <div style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          background: entry.isCurrentUser ? 'var(--neo-accent)' : 'var(--neo-bg-light)',
                          color: entry.isCurrentUser ? '#fff' : 'var(--neo-text-secondary)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                        }}>
                          {entry.initials}
                        </div>
                        <span>{entry.isCurrentUser ? `${entry.name} (vous)` : entry.name}</span>
                      </div>
                    </td>
                    <td>
                      <span style={{
                        fontSize: '0.75rem',
                        padding: '2px 8px',
                        borderRadius: '10px',
                        background: `${entry.level.color}22`,
                        color: entry.level.color,
                        fontWeight: 600,
                      }}>
                        <i className={`bi ${entry.level.icon} me-1`}></i>
                        {entry.level.label}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <span style={{ color: 'var(--neo-xp-color)', fontWeight: 600 }}>
                        <AnimatedCounter value={entry.xp} />
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {entry.streak > 0 ? (
                        <span>🔥 {entry.streak}</span>
                      ) : (
                        <span style={{ color: 'var(--neo-text-muted)' }}>-</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>{entry.dealsWon}</td>
                    <td style={{ textAlign: 'right' }}>{formatCurrency(entry.revenue)}</td>
                    <td>
                      <i className={`bi bi-arrow-${entry.trend === 'up' ? 'up' : entry.trend === 'down' ? 'down' : 'right'}`}
                        style={{
                          color: entry.trend === 'up' ? 'var(--neo-success)' : entry.trend === 'down' ? 'var(--neo-danger)' : 'var(--neo-text-muted)',
                        }}
                      ></i>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

// Podium card for top 3
function PodiumCard({ entry, place }: { entry: LeaderboardEntry; place: number }) {
  const colors = { 1: '#f59e0b', 2: '#94a3b8', 3: '#cd7f32' };
  const medals = { 1: '🥇', 2: '🥈', 3: '🥉' };
  const color = colors[place as keyof typeof colors];

  return (
    <div
      className="glass-card text-center animate-slide-in-up"
      style={{
        padding: place === 1 ? '24px 16px' : '20px 16px',
        borderColor: `${color}44`,
        transform: place === 1 ? 'scale(1.05)' : undefined,
      }}
    >
      <div style={{ fontSize: place === 1 ? '2.5rem' : '2rem', marginBottom: '8px' }}>
        {medals[place as keyof typeof medals]}
      </div>
      <div style={{
        width: place === 1 ? '56px' : '48px',
        height: place === 1 ? '56px' : '48px',
        borderRadius: '50%',
        background: entry.isCurrentUser ? 'var(--neo-accent)' : `${color}22`,
        color: entry.isCurrentUser ? '#fff' : color,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: place === 1 ? '1.1rem' : '0.9rem',
        fontWeight: 600,
        margin: '0 auto 8px',
        border: `2px solid ${color}`,
      }}>
        {entry.initials}
      </div>
      <div style={{
        fontWeight: 600,
        fontSize: '0.9rem',
        color: 'var(--neo-text-primary)',
        marginBottom: '4px',
      }}>
        {entry.isCurrentUser ? 'Vous' : entry.name}
      </div>
      <div style={{
        fontWeight: 700,
        fontSize: '1.2rem',
        color: 'var(--neo-xp-color)',
        marginBottom: '4px',
      }}>
        <AnimatedCounter value={entry.xp} /> XP
      </div>
      <span style={{
        fontSize: '0.7rem',
        padding: '2px 8px',
        borderRadius: '10px',
        background: `${entry.level.color}22`,
        color: entry.level.color,
        fontWeight: 600,
      }}>
        {entry.level.label}
      </span>
    </div>
  );
}

export default LeaderboardPage;
