import { useGamificationStore, useAuthStore } from '../../stores';
import { Card, CardHeader, CardBody } from '../../components';
import { AnimatedCounter } from '../../components/ui/AnimatedCounter';
import { XPProgressBar, BadgeGrid, StreakDisplay } from '../../components/gamification';
// computeLevelProgress used by XPProgressBar internally
import { LEVELS } from '../../types/gamification.types';
import { XAxis, YAxis, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';

export function ProfilePage() {
  const { user } = useAuthStore();
  const { profile } = useGamificationStore();

  const initials = user
    ? `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase()
    : '?';

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
    <div className="profile-page">
      <div className="row g-4">
        {/* Left: Profile Card */}
        <div className="col-lg-4">
          {/* User Card */}
          <div className="glass-card text-center mb-4" style={{ padding: '24px' }}>
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: `linear-gradient(135deg, var(--neo-accent), ${profile.level.color})`,
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.8rem',
              fontWeight: 700,
              margin: '0 auto 12px',
              border: `3px solid ${profile.level.color}`,
            }}>
              {initials}
            </div>
            <h4 style={{ margin: '0 0 4px', color: 'var(--neo-text-primary)' }}>
              {user?.firstName} {user?.lastName}
            </h4>
            <div style={{ color: 'var(--neo-text-secondary)', marginBottom: '12px' }}>
              {user?.role}
            </div>

            {/* Level badge */}
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 16px',
              borderRadius: '20px',
              background: `${profile.level.color}22`,
              color: profile.level.color,
              fontWeight: 600,
              marginBottom: '16px',
            }}>
              <i className={`bi ${profile.level.icon}`}></i>
              {profile.level.label}
            </div>

            {/* XP */}
            <div style={{
              fontSize: '2rem',
              fontWeight: 700,
              color: 'var(--neo-xp-color)',
              lineHeight: 1.2,
            }}>
              <AnimatedCounter value={profile.totalXP} /> XP
            </div>
          </div>

          {/* Streak */}
          <div className="mb-4">
            <StreakDisplay />
          </div>

          {/* Stats Summary */}
          <Card>
            <CardHeader>Statistiques</CardHeader>
            <CardBody>
              <div className="d-flex flex-column gap-3">
                <StatRow label="Leads créés" value={profile.stats.leadsCreated} icon="bi-person-plus" />
                <StatRow label="Deals gagnés" value={profile.stats.leadsWon} icon="bi-trophy" color="var(--neo-success)" />
                <StatRow label="Deals perdus" value={profile.stats.leadsLost} icon="bi-x-circle" color="var(--neo-danger)" />
                <StatRow label="Activités complétées" value={profile.stats.activitiesCompleted} icon="bi-check-circle" />
                <StatRow label="Appels passés" value={profile.stats.callsMade} icon="bi-telephone" />
                <StatRow label="Emails envoyés" value={profile.stats.emailsSent} icon="bi-envelope" />
                <StatRow label="Réunions" value={profile.stats.meetingsHeld} icon="bi-people" />
                <StatRow label="Visites" value={profile.stats.visitsDone} icon="bi-geo-alt" />
                <hr style={{ borderColor: 'var(--neo-border-color)' }} />
                <StatRow label="CA généré" value={formatCurrency(profile.stats.totalRevenue)} icon="bi-currency-euro" color="var(--neo-xp-color)" />
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Right: XP history + Badges */}
        <div className="col-lg-8">
          {/* XP Progress */}
          <div className="mb-4">
            <XPProgressBar />
          </div>

          {/* XP History Chart */}
          <Card className="mb-4">
            <CardHeader>Progression XP (7 derniers jours)</CardHeader>
            <CardBody>
              <div style={{ height: '200px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={xpHistory}>
                    <defs>
                      <linearGradient id="xpGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--neo-accent)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="var(--neo-accent)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="day"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: 'var(--neo-text-muted)', fontSize: 12 }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: 'var(--neo-text-muted)', fontSize: 12 }}
                    />
                    <Tooltip
                      contentStyle={{
                        background: 'var(--neo-bg-card)',
                        border: '1px solid var(--neo-border-color)',
                        borderRadius: '8px',
                        color: 'var(--neo-text-primary)',
                      }}
                      formatter={(value) => [`${Number(value).toLocaleString('fr-FR')} XP`, 'XP Total']}
                    />
                    <Area
                      type="monotone"
                      dataKey="xp"
                      stroke="var(--neo-accent)"
                      strokeWidth={2}
                      fill="url(#xpGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardBody>
          </Card>

          {/* Level Progress */}
          <Card className="mb-4">
            <CardHeader>Progression des niveaux</CardHeader>
            <CardBody>
              <div className="d-flex flex-wrap gap-2">
                {LEVELS.map((level) => {
                  const isReached = profile.totalXP >= level.minXP;
                  const isCurrent = profile.level.tier === level.tier;
                  return (
                    <div
                      key={level.tier}
                      style={{
                        flex: '1 1 120px',
                        padding: '12px',
                        borderRadius: '10px',
                        background: isCurrent ? `${level.color}22` : 'var(--neo-bg-light)',
                        border: isCurrent ? `2px solid ${level.color}` : '1px solid var(--neo-border-color)',
                        textAlign: 'center',
                        opacity: isReached ? 1 : 0.4,
                      }}
                    >
                      <i className={`bi ${level.icon}`} style={{
                        color: isReached ? level.color : 'var(--neo-text-muted)',
                        fontSize: '1.3rem',
                        display: 'block',
                        marginBottom: '4px',
                      }}></i>
                      <div style={{
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        color: isReached ? level.color : 'var(--neo-text-muted)',
                      }}>
                        {level.label}
                      </div>
                      <div style={{
                        fontSize: '0.7rem',
                        color: 'var(--neo-text-muted)',
                      }}>
                        {level.minXP.toLocaleString('fr-FR')} XP
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardBody>
          </Card>

          {/* Badge Collection */}
          <Card>
            <CardHeader>
              <div className="d-flex align-items-center justify-content-between">
                <span>Collection de badges</span>
                <span style={{
                  fontSize: '0.8rem',
                  color: 'var(--neo-accent)',
                  fontWeight: 600,
                }}>
                  {profile.badges.length} débloqués
                </span>
              </div>
            </CardHeader>
            <CardBody>
              <BadgeGrid />
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}

function StatRow({ label, value, icon, color }: { label: string; value: string | number; icon: string; color?: string }) {
  return (
    <div className="d-flex align-items-center justify-content-between">
      <div className="d-flex align-items-center gap-2">
        <i className={`bi ${icon}`} style={{ color: color || 'var(--neo-text-secondary)', fontSize: '0.9rem' }}></i>
        <span style={{ fontSize: '0.85rem', color: 'var(--neo-text-secondary)' }}>{label}</span>
      </div>
      <span style={{ fontWeight: 600, color: color || 'var(--neo-text-primary)' }}>{value}</span>
    </div>
  );
}

export default ProfilePage;
