import { useGamificationStore, useAuthStore } from '../../stores';
import { Card, Avatar, Icon } from '../../components/neo';
import type { IconName } from '../../components/neo';
import { AnimatedCounter } from '../../components/ui/AnimatedCounter';
import { XPProgressBar, BadgeGrid, StreakDisplay } from '../../components/gamification';
// computeLevelProgress used by XPProgressBar internally
import { LEVELS } from '../../types/gamification.types';
import { XAxis, YAxis, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';

export function ProfilePage() {
  const { user } = useAuthStore();
  const { profile } = useGamificationStore();

  const fullName = user ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() : '';

  // Level index for progression display

  // Mock XP history data (would come from backend in production)
  const xpHistory = [
    { day: 'Lun', xp: Math.round(profile.totalXP * 0.75) },
    { day: 'Mar', xp: Math.round(profile.totalXP * 0.8) },
    { day: 'Mer', xp: Math.round(profile.totalXP * 0.85) },
    { day: 'Jeu', xp: Math.round(profile.totalXP * 0.88) },
    { day: 'Ven', xp: Math.round(profile.totalXP * 0.92) },
    { day: 'Sam', xp: Math.round(profile.totalXP * 0.96) },
    { day: 'Dim', xp: profile.totalXP },
  ];

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value);

  return (
    <div style={{ padding: 28 }}>
      <div className="lead-grid">
        {/* Left: Profile Card */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* User Card */}
          <Card>
            <div className="card-body" style={{ textAlign: 'center' }}>
              <Avatar
                name={fullName}
                size={80}
                tone="grad"
                style={{ margin: '0 auto 12px', border: `3px solid ${profile.level.color}` }}
              />
              <h4 style={{ margin: '0 0 4px', color: 'var(--ink)' }}>{fullName}</h4>
              <div style={{ color: 'var(--ink-3)', marginBottom: 12 }}>{user?.role}</div>

              {/* Level badge */}
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 16px',
                  borderRadius: 'var(--r-pill)',
                  background: `${profile.level.color}22`,
                  color: profile.level.color,
                  fontWeight: 600,
                  marginBottom: 16,
                }}
              >
                <i className={`bi ${profile.level.icon}`}></i>
                {profile.level.label}
              </div>

              {/* XP */}
              <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--ochre)', lineHeight: 1.2 }}>
                <AnimatedCounter value={profile.totalXP} /> XP
              </div>
            </div>
          </Card>

          {/* Streak */}
          <StreakDisplay />

          {/* Stats Summary */}
          <Card head="Statistiques" icon="chart">
            <div className="card-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <StatRow label="Leads créés" value={profile.stats.leadsCreated} icon="user" />
                <StatRow label="Deals gagnés" value={profile.stats.leadsWon} icon="trophy" color="var(--success)" />
                <StatRow label="Deals perdus" value={profile.stats.leadsLost} icon="x" color="var(--danger)" />
                <StatRow label="Activités complétées" value={profile.stats.activitiesCompleted} icon="checkCircle" />
                <StatRow label="Appels passés" value={profile.stats.callsMade} icon="phone" />
                <StatRow label="Emails envoyés" value={profile.stats.emailsSent} icon="mail" />
                <StatRow label="Réunions" value={profile.stats.meetingsHeld} icon="users" />
                <StatRow label="Visites" value={profile.stats.visitsDone} icon="building" />
                <hr style={{ borderColor: 'var(--line)', margin: 0 }} />
                <StatRow label="CA généré" value={formatCurrency(profile.stats.totalRevenue)} icon="euro" color="var(--ochre)" />
              </div>
            </div>
          </Card>
        </div>

        {/* Right: XP history + Badges */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* XP Progress */}
          <XPProgressBar />

          {/* XP History Chart */}
          <Card head="Progression XP (7 derniers jours)" icon="activity">
            <div className="card-body">
              <div style={{ height: 200 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={xpHistory}>
                    <defs>
                      <linearGradient id="xpGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--komun)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="var(--komun)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="day"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: 'var(--ink-4)', fontSize: 12 }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: 'var(--ink-4)', fontSize: 12 }}
                    />
                    <Tooltip
                      contentStyle={{
                        background: 'var(--card)',
                        border: '1px solid var(--line)',
                        borderRadius: 8,
                        color: 'var(--ink)',
                      }}
                      formatter={(value) => [`${Number(value).toLocaleString('fr-FR')} XP`, 'XP Total']}
                    />
                    <Area
                      type="monotone"
                      dataKey="xp"
                      stroke="var(--komun)"
                      strokeWidth={2}
                      fill="url(#xpGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </Card>

          {/* Level Progress */}
          <Card head="Progression des niveaux" icon="medal">
            <div className="card-body">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {LEVELS.map((level) => {
                  const isReached = profile.totalXP >= level.minXP;
                  const isCurrent = profile.level.tier === level.tier;
                  return (
                    <div
                      key={level.tier}
                      style={{
                        flex: '1 1 120px',
                        padding: 12,
                        borderRadius: 'var(--r-md)',
                        background: isCurrent ? `${level.color}22` : 'var(--paper)',
                        border: isCurrent ? `2px solid ${level.color}` : '1px solid var(--line)',
                        textAlign: 'center',
                        opacity: isReached ? 1 : 0.4,
                      }}
                    >
                      <i
                        className={`bi ${level.icon}`}
                        style={{
                          color: isReached ? level.color : 'var(--ink-4)',
                          fontSize: '1.3rem',
                          display: 'block',
                          marginBottom: 4,
                        }}
                      ></i>
                      <div
                        style={{
                          fontSize: 12.5,
                          fontWeight: 600,
                          color: isReached ? level.color : 'var(--ink-4)',
                        }}
                      >
                        {level.label}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--ink-4)' }}>
                        {level.minXP.toLocaleString('fr-FR')} XP
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>

          {/* Badge Collection */}
          <Card
            head="Collection de badges"
            icon="star"
            action={
              <span style={{ fontSize: 12.5, color: 'var(--komun)', fontWeight: 600 }}>
                {profile.badges.length} débloqués
              </span>
            }
          >
            <div className="card-body">
              <BadgeGrid />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function StatRow({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string | number;
  icon: IconName;
  color?: string;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ color: color || 'var(--ink-3)', display: 'inline-flex' }}>
          <Icon name={icon} size={15} />
        </span>
        <span style={{ fontSize: 13.5, color: 'var(--ink-3)' }}>{label}</span>
      </div>
      <span style={{ fontWeight: 600, color: color || 'var(--ink)' }}>{value}</span>
    </div>
  );
}

export default ProfilePage;
