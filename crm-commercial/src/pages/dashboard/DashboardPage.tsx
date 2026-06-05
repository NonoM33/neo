import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Spinner } from '../../components';
import { kpisService, leadsService, activitiesService } from '../../services';
import { appointmentsService } from '../../services/appointments.service';
import type { DashboardData, Lead, Activity, PipelineAnalysis, LeadStatus } from '../../types';
import type { Appointment } from '../../types/appointment.types';
import {
  APPOINTMENT_TYPE_LABELS,
  APPOINTMENT_TYPE_COLORS,
  APPOINTMENT_STATUS_LABELS,
  LOCATION_TYPE_LABELS,
} from '../../types/appointment.types';
import { LEAD_STATUS_LABELS, ACTIVITY_TYPE_LABELS } from '../../types';
import { useAuthStore, useGamificationStore } from '../../stores';
import { computeLevelProgress } from '../../services/gamification.engine';
import { Icon, Avatar, Pill, Btn, Card, type IconName } from '../../components/neo';
import type { PillTone } from '../../components/neo';

interface PrepStep {
  id: string;
  label: string;
  icon: IconName;
  description: string;
}

const PREP_STEPS: PrepStep[] = [
  { id: 'review_client', label: 'Revoir le dossier client', icon: 'user', description: "Relisez les infos du lead/client et l'historique des échanges" },
  { id: 'prepare_docs', label: 'Préparer les documents', icon: 'fileText', description: 'Devis, brochures, contrats à jour' },
  { id: 'check_route', label: "Vérifier l'itinéraire", icon: 'target', description: 'Estimez le temps de trajet et planifiez le départ' },
  { id: 'confirm_rdv', label: 'Confirmer le RDV', icon: 'phone', description: "Rappelez le client pour confirmer l'heure et le lieu" },
  { id: 'prepare_pitch', label: "Préparer l'argumentaire", icon: 'message', description: 'Points clés à aborder, objections anticipées' },
];

const LEAD_TONE: Record<LeadStatus, PillTone> = {
  prospect: 'neutral',
  qualifie: 'info',
  proposition: 'ochre',
  negociation: 'warning',
  gagne: 'success',
  perdu: 'danger',
};

function leadTone(status: LeadStatus): PillTone {
  return LEAD_TONE[status] ?? 'neutral';
}

function getGoogleMapsDirectionsUrl(address: string): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}&travelmode=driving`;
}

function getTimeUntil(dateStr: string): string {
  const now = new Date();
  const target = new Date(dateStr);
  const diffMs = target.getTime() - now.getTime();
  if (diffMs < 0) return 'Maintenant';
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 60) return `Dans ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) {
    const remainMin = diffMin % 60;
    return remainMin > 0 ? `Dans ${diffH}h${String(remainMin).padStart(2, '0')}` : `Dans ${diffH}h`;
  }
  const diffDays = Math.floor(diffH / 24);
  if (diffDays === 1) return 'Demain';
  return `Dans ${diffDays} jours`;
}

function isToday(dateStr: string): boolean {
  const d = new Date(dateStr);
  return d.toDateString() === new Date().toDateString();
}

function isTomorrow(dateStr: string): boolean {
  const d = new Date(dateStr);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return d.toDateString() === tomorrow.toDateString();
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value);

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });

export function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const gamification = useGamificationStore();
  const { profile, challenges, leaderboard } = gamification;
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [pipeline, setPipeline] = useState<PipelineAnalysis | null>(null);
  const [recentLeads, setRecentLeads] = useState<Lead[]>([]);
  const [upcomingActivities, setUpcomingActivities] = useState<Activity[]>([]);
  const [upcomingAppointments, setUpcomingAppointments] = useState<Appointment[]>([]);
  const [checkedSteps, setCheckedSteps] = useState<Record<string, Set<string>>>({});

  useEffect(() => {
    let cancelled = false;
    const loadData = async () => {
      try {
        const now = new Date();
        const fromDate = now.toISOString().split('T')[0];
        const toDate = new Date(now.getTime() + 14 * 86400000).toISOString().split('T')[0];

        const [dashboardData, pipelineData, leadsData, activitiesData, appointmentsData] = await Promise.all([
          kpisService.getDashboard(),
          kpisService.getPipeline(),
          leadsService.getLeads({}, 1, 100),
          activitiesService.getUpcoming(),
          appointmentsService.getAppointments({ fromDate, toDate }).catch(() => [] as Appointment[]),
        ]);
        if (cancelled) return;

        setDashboard(dashboardData);
        setPipeline(pipelineData);
        setRecentLeads(leadsData.data);

        const allActivities = await activitiesService.getActivities({}, 1, 100);
        if (cancelled) return;
        setUpcomingActivities(activitiesData.slice(0, 5));

        const upcoming = appointmentsData
          .filter(
            (a) =>
              a.status !== 'annule' &&
              a.status !== 'no_show' &&
              a.status !== 'termine' &&
              new Date(a.scheduledAt) >= new Date(now.getTime() - 3600000),
          )
          .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
        setUpcomingAppointments(upcoming);

        const currentUser = useAuthStore.getState().user;
        const userName = currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'Utilisateur';
        const userInitials = currentUser
          ? `${currentUser.firstName?.[0] || ''}${currentUser.lastName?.[0] || ''}`.toUpperCase()
          : '?';
        useGamificationStore.getState().initialize(leadsData.data, allActivities.data, dashboardData, userName, userInitials);
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    loadData();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('neo-prep-steps');
      if (saved) {
        const parsed = JSON.parse(saved);
        const restored: Record<string, Set<string>> = {};
        for (const [k, v] of Object.entries(parsed)) {
          restored[k] = new Set(v as string[]);
        }
        setCheckedSteps(restored);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const saveCheckedSteps = (steps: Record<string, Set<string>>) => {
    const serializable: Record<string, string[]> = {};
    for (const [k, v] of Object.entries(steps)) {
      serializable[k] = Array.from(v);
    }
    localStorage.setItem('neo-prep-steps', JSON.stringify(serializable));
  };

  const toggleStep = (appointmentId: string, stepId: string) => {
    setCheckedSteps((prev) => {
      const updated = { ...prev };
      const set = new Set(prev[appointmentId] || []);
      if (set.has(stepId)) set.delete(stepId);
      else set.add(stepId);
      updated[appointmentId] = set;
      saveCheckedSteps(updated);
      return updated;
    });
  };

  if (loading) {
    return <Spinner />;
  }

  const nextAppointment = upcomingAppointments[0] || null;
  const otherAppointments = upcomingAppointments.slice(1, 4);

  const firstName = user?.firstName || 'vous';
  const todayLabel = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

  const levelProgress = computeLevelProgress(profile.totalXP);
  const nextLevelXP = Number.isFinite(profile.level.maxXP) ? profile.level.maxXP + 1 : null;
  const xpToNext = nextLevelXP ? nextLevelXP - profile.totalXP : 0;

  const stats: { icon: IconName; tone: string; val: string; label: string }[] = [
    { icon: 'filter', tone: 'blue', val: String(dashboard?.leads.open ?? 0), label: 'Leads ouverts' },
    { icon: 'trophy', tone: 'green', val: String(dashboard?.leads.won ?? 0), label: 'Leads gagnés' },
    { icon: 'chart', tone: 'ink', val: `${dashboard?.leads.conversionRate ?? 0}%`, label: 'Taux conversion' },
    { icon: 'euro', tone: 'ochre', val: formatCurrency(dashboard?.revenue.weightedValue ?? 0), label: 'CA potentiel' },
  ];

  return (
    <div className="screen">
      <div className="page-head">
        <div className="ph-l">
          <h1>Bonjour, {firstName} 👋</h1>
          <p>Voici ce qui se passe chez Neo aujourd'hui — {todayLabel}.</p>
        </div>
        <div className="page-actions">
          <Btn variant="ghost" icon="calendar" onClick={() => navigate('/activities')}>
            Cette semaine
          </Btn>
          <Btn icon="plus" onClick={() => navigate('/leads')}>
            Nouveau lead
          </Btn>
        </div>
      </div>

      {/* KPIs */}
      <div className="stat-grid mb-22">
        {stats.map((s) => (
          <div className="stat" key={s.label}>
            <div className="st-top">
              <span className={'st-ic ' + s.tone}>
                <Icon name={s.icon} size={19} />
              </span>
            </div>
            <div className="st-val">{s.val}</div>
            <div className="st-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Next appointment */}
      {nextAppointment && (
        <div className="mb-22">
          <NextAppointmentCard
            appointment={nextAppointment}
            checkedSteps={checkedSteps[nextAppointment.id] || new Set()}
            onToggleStep={(stepId) => toggleStep(nextAppointment.id, stepId)}
            navigate={navigate}
          />
        </div>
      )}

      {otherAppointments.length > 0 && (
        <div className="chart-grid mb-22" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
          {otherAppointments.map((apt) => (
            <CompactAppointmentCard key={apt.id} appointment={apt} navigate={navigate} />
          ))}
        </div>
      )}

      {/* Gamification: XP + challenges/leaderboard */}
      <div className="chart-grid mb-22">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="xp-card">
            <div className="xp-top">
              <Avatar name={profile.stats ? `${firstName}` : 'Neo'} size={46} tone="ochre" />
              <div>
                <div className="xp-lvl">{profile.level.label}</div>
                <div className="xp-name">{profile.totalXP.toLocaleString('fr-FR')} XP</div>
              </div>
              <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    color: '#ffd089',
                    fontWeight: 700,
                    fontSize: 15,
                  }}
                >
                  <Icon name="flame" size={17} /> {profile.streak}
                </div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,.6)' }}>jours de série</div>
              </div>
            </div>
            <div className="xp-bar">
              <i style={{ width: `${Math.round(levelProgress * 100)}%` }} />
            </div>
            <div className="xp-meta">
              <span>{profile.totalXP.toLocaleString('fr-FR')} XP</span>
              <span>
                {nextLevelXP
                  ? `Niveau suivant dans ${xpToNext.toLocaleString('fr-FR')} XP`
                  : 'Niveau maximum atteint'}
              </span>
            </div>
            {profile.badges.length > 0 && (
              <div className="badges-row">
                {profile.badges.slice(0, 6).map((b) => (
                  <span className="badge-chip" key={b.badgeId} title={b.badgeId}>
                    <Icon name="medal" size={20} />
                  </span>
                ))}
              </div>
            )}
          </div>

          <Card head="Classement" icon="trophy" action={<a className="contact-link" style={{ fontSize: 13, cursor: 'pointer' }} onClick={() => navigate('/leaderboard')}>Voir tout</a>} flush>
            <div style={{ padding: '4px 18px 12px' }}>
              {leaderboard.slice(0, 5).map((e) => (
                <div className="lrow" key={e.userId}>
                  <span className="cell-id" style={{ width: 22, textAlign: 'center' }}>{e.rank}</span>
                  <Avatar name={e.name} size={32} tone={e.isCurrentUser ? 'blue' : 'ink'} />
                  <div className="lr-main">
                    <b>{e.name}</b>
                    <small>{e.level.label}</small>
                  </div>
                  {e.isCurrentUser && <Pill tone="info">Vous</Pill>}
                  <span className="lr-val">{e.xp.toLocaleString('fr-FR')} XP</span>
                </div>
              ))}
              {leaderboard.length === 0 && <div className="empty">Classement indisponible</div>}
            </div>
          </Card>
        </div>

        <Card head="Défis du jour" icon="zap" action={<Pill tone="info">{challenges.filter((c) => !c.completed).length} en cours</Pill>}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {challenges.slice(0, 4).map((c) => {
              const pct = Math.min(100, Math.round((c.current / c.target) * 100));
              return (
                <div key={c.id}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span className={'st-ic ' + (c.completed ? 'green' : 'blue')} style={{ width: 30, height: 30, borderRadius: 8 }}>
                      <Icon name={c.completed ? 'check' : 'target'} size={15} />
                    </span>
                    <div style={{ flex: 1 }}>
                      <b style={{ fontSize: 13.5 }}>{c.title}</b>
                      <div style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>{c.description}</div>
                    </div>
                    <Pill tone={c.completed ? 'success' : 'ochre'}>+{c.xpReward} XP</Pill>
                  </div>
                  <div className="xp-bar" style={{ background: 'var(--line)' }}>
                    <i style={{ width: `${pct}%`, background: c.completed ? 'var(--success)' : 'linear-gradient(90deg,var(--komun),#6f8dff)' }} />
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 3, textAlign: 'right' }}>
                    {c.current}/{c.target}
                  </div>
                </div>
              );
            })}
            {challenges.length === 0 && <div className="empty">Aucun défi disponible</div>}
          </div>
        </Card>
      </div>

      {/* Pipeline */}
      <div className="mb-22">
        <Card
          head="Pipeline"
          icon="filter"
          action={
            <a className="contact-link" style={{ fontSize: 13, cursor: 'pointer' }} onClick={() => navigate('/leads')}>
              Voir tout
            </a>
          }
        >
          <div className="stat-grid" style={{ gridTemplateColumns: `repeat(${Math.max(pipeline?.stages.length ?? 4, 1)}, 1fr)` }}>
            {pipeline?.stages.map((stage) => (
              <div className="stat" key={stage.status} style={{ textAlign: 'center' }}>
                <div className="st-val" style={{ fontSize: 26 }}>{stage.count}</div>
                <div className="st-label">
                  {LEAD_STATUS_LABELS[stage.status as keyof typeof LEAD_STATUS_LABELS] || stage.status}
                </div>
                <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 4, fontFamily: 'var(--font-mono)' }}>
                  {formatCurrency(stage.weightedValue)}
                </div>
              </div>
            ))}
            {!pipeline?.stages.length && <div className="empty">Pipeline vide</div>}
          </div>
        </Card>
      </div>

      {/* Recent leads + activities */}
      <div className="chart-grid">
        <Card
          head="Leads récents"
          icon="users"
          action={
            <a className="contact-link" style={{ fontSize: 13, cursor: 'pointer' }} onClick={() => navigate('/leads')}>
              Voir tout
            </a>
          }
          flush
        >
          <div style={{ padding: '4px 18px 12px' }}>
            {recentLeads.slice(0, 5).map((lead, i) => (
              <div className="lrow" key={lead.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/leads/${lead.id}`)}>
                <Avatar name={`${lead.firstName} ${lead.lastName}`} size={36} tone={(['ochre', 'blue', 'green', 'ink', 'ochre'] as const)[i % 5]} />
                <div className="lr-main">
                  <b>{lead.firstName} {lead.lastName}</b>
                  <small>{lead.title || '—'}</small>
                </div>
                <Pill tone={leadTone(lead.status)} dot>
                  {LEAD_STATUS_LABELS[lead.status]}
                </Pill>
                <span className="lr-val">
                  {lead.estimatedValue ? formatCurrency(parseFloat(lead.estimatedValue)) : '—'}
                </span>
              </div>
            ))}
            {recentLeads.length === 0 && <div className="empty">Aucun lead récent</div>}
          </div>
        </Card>

        <Card
          head="Activités à venir"
          icon="calendar"
          action={
            <a className="contact-link" style={{ fontSize: 13, cursor: 'pointer' }} onClick={() => navigate('/activities')}>
              Voir tout
            </a>
          }
          flush
        >
          <div style={{ padding: '4px 18px 12px' }}>
            {upcomingActivities.map((activity) => (
              <div className="lrow" key={activity.id}>
                <span className="st-ic blue" style={{ width: 34, height: 34, borderRadius: 9 }}>
                  <Icon name="activity" size={16} />
                </span>
                <div className="lr-main">
                  <b>{activity.subject}</b>
                  <small>{ACTIVITY_TYPE_LABELS[activity.type]}</small>
                </div>
                <span className="lr-val">{activity.scheduledAt ? formatDate(activity.scheduledAt) : '—'}</span>
              </div>
            ))}
            {upcomingActivities.length === 0 && <div className="empty">Aucune activité planifiée</div>}
          </div>
        </Card>
      </div>
    </div>
  );
}

// ---------- Next Appointment Card ----------

function NextAppointmentCard({
  appointment,
  checkedSteps,
  onToggleStep,
  navigate,
}: {
  appointment: Appointment;
  checkedSteps: Set<string>;
  onToggleStep: (stepId: string) => void;
  navigate: ReturnType<typeof useNavigate>;
}) {
  const typeColor = APPOINTMENT_TYPE_COLORS[appointment.type];
  const timeLabel = getTimeUntil(appointment.scheduledAt);
  const todayFlag = isToday(appointment.scheduledAt);
  const tomorrowFlag = isTomorrow(appointment.scheduledAt);
  const hasSiteLocation =
    (appointment.locationType === 'sur_site' || appointment.locationType === 'bureau') && appointment.location;

  const completedSteps = checkedSteps.size;
  const totalSteps = PREP_STEPS.length;
  const progressPct = Math.round((completedSteps / totalSteps) * 100);

  const locationIcon: IconName =
    appointment.locationType === 'visio'
      ? 'message'
      : appointment.locationType === 'telephone'
        ? 'phone'
        : appointment.locationType === 'bureau'
          ? 'building'
          : 'target';

  return (
    <Card flush>
      <div className="rdv-split">
        <div className="rdv-main">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
            {todayFlag && <Pill tone="danger" dot>Aujourd'hui</Pill>}
            {tomorrowFlag && <Pill tone="warning" dot>Demain</Pill>}
            <Pill tone="info">{APPOINTMENT_STATUS_LABELS[appointment.status]}</Pill>
            <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink-3)' }}>{timeLabel}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: 13,
                background: typeColor,
                color: '#fff',
                display: 'grid',
                placeItems: 'center',
                flexShrink: 0,
              }}
            >
              <Icon name="calendar" size={24} />
            </div>
            <div>
              <h3 style={{ fontSize: 19, fontWeight: 600, letterSpacing: '-.01em', marginBottom: 4 }}>
                {appointment.title}
              </h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', fontSize: 13.5 }}>
                <span style={{ color: typeColor, fontWeight: 600 }}>{APPOINTMENT_TYPE_LABELS[appointment.type]}</span>
                {appointment.lead && (
                  <span
                    className="contact-link"
                    style={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/leads/${appointment.lead!.id}`)}
                  >
                    <Icon name="user" size={14} /> {appointment.lead.firstName} {appointment.lead.lastName}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 18, marginBottom: 18, fontSize: 13.5, color: 'var(--ink-2)' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
              <Icon name="calendar" size={16} />
              {new Date(appointment.scheduledAt).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
              <Icon name="clock" size={16} />
              {new Date(appointment.scheduledAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
              {' – '}
              {new Date(appointment.endAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
              <span style={{ color: 'var(--ink-4)' }}>({appointment.duration} min)</span>
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
              <Icon name={locationIcon} size={16} />
              {LOCATION_TYPE_LABELS[appointment.locationType]}
              {appointment.location && <span style={{ color: 'var(--ink-4)' }}>· {appointment.location}</span>}
            </span>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <Btn size="sm" icon="search" onClick={() => navigate(`/calendar/${appointment.id}`)}>
              Voir le RDV
            </Btn>
            {hasSiteLocation && (
              <a href={getGoogleMapsDirectionsUrl(appointment.location!)} target="_blank" rel="noopener noreferrer">
                <Btn size="sm" variant="ghost" icon="target">
                  Itinéraire
                </Btn>
              </a>
            )}
            {appointment.lead && (
              <Btn size="sm" variant="subtle" icon="user" onClick={() => navigate(`/leads/${appointment.lead!.id}`)}>
                Dossier client
              </Btn>
            )}
          </div>
        </div>

        <div className="rdv-side">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h4 style={{ fontSize: 14, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 7 }}>
              <Icon name="checkCircle" size={16} /> Préparation
            </h4>
            <Pill tone={progressPct === 100 ? 'success' : 'info'}>
              {completedSteps}/{totalSteps}
            </Pill>
          </div>

          <div className="xp-bar" style={{ background: 'var(--line)', marginBottom: 14 }}>
            <i style={{ width: `${progressPct}%`, background: progressPct === 100 ? 'var(--success)' : 'var(--komun)' }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {PREP_STEPS.map((step) => {
              const checked = checkedSteps.has(step.id);
              const isRouteStep = step.id === 'check_route' && hasSiteLocation;
              return (
                <div
                  key={step.id}
                  className="prep-row"
                  style={{ cursor: 'pointer', background: checked ? 'var(--success-soft)' : 'transparent' }}
                  onClick={() => onToggleStep(step.id)}
                >
                  <span
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 7,
                      flex: 'none',
                      display: 'grid',
                      placeItems: 'center',
                      border: '1.5px solid ' + (checked ? 'var(--success)' : 'var(--line-2)'),
                      background: checked ? 'var(--success)' : 'transparent',
                      color: '#fff',
                    }}
                  >
                    {checked && <Icon name="check" size={14} />}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontWeight: 500,
                        fontSize: 13,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        textDecoration: checked ? 'line-through' : 'none',
                        color: checked ? 'var(--ink-3)' : 'var(--ink)',
                      }}
                    >
                      <Icon name={step.icon} size={13} />
                      {step.label}
                    </div>
                    <div style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>{step.description}</div>
                    {isRouteStep && !checked && (
                      <a
                        href={getGoogleMapsDirectionsUrl(appointment.location!)}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        style={{ display: 'inline-block', marginTop: 4 }}
                      >
                        <Btn size="sm" variant="ghost" icon="target">
                          Voir l'itinéraire
                        </Btn>
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {progressPct === 100 && (
            <div
              style={{
                textAlign: 'center',
                marginTop: 14,
                padding: 10,
                borderRadius: 10,
                background: 'var(--success-soft)',
                color: 'var(--success)',
                fontSize: 13,
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                justifyContent: 'center',
                width: '100%',
              }}
            >
              <Icon name="checkCircle" size={16} /> Préparation terminée !
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

// ---------- Compact Appointment Card ----------

function CompactAppointmentCard({
  appointment,
  navigate,
}: {
  appointment: Appointment;
  navigate: ReturnType<typeof useNavigate>;
}) {
  const typeColor = APPOINTMENT_TYPE_COLORS[appointment.type];
  const hasSiteLocation =
    (appointment.locationType === 'sur_site' || appointment.locationType === 'bureau') && appointment.location;
  const todayFlag = isToday(appointment.scheduledAt);

  return (
    <Card style={{ cursor: 'pointer' }} className="rdv-card" >
      <div onClick={() => navigate(`/calendar/${appointment.id}`)}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <span style={{ width: 32, height: 32, borderRadius: 9, background: typeColor, color: '#fff', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
            <Icon name="calendar" size={16} />
          </span>
          <b style={{ flex: 1, fontSize: 13.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {appointment.title}
          </b>
          {todayFlag && <Pill tone="danger">Auj.</Pill>}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 12.5, color: 'var(--ink-3)' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
            <Icon name="calendar" size={14} />
            {new Date(appointment.scheduledAt).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}{' '}
            {new Date(appointment.scheduledAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
          </span>
          {appointment.lead && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
              <Icon name="user" size={14} />
              {appointment.lead.firstName} {appointment.lead.lastName}
            </span>
          )}
          {appointment.location && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              <Icon name="target" size={14} />
              {appointment.location}
            </span>
          )}
        </div>
      </div>
      {hasSiteLocation && (
        <a
          href={getGoogleMapsDirectionsUrl(appointment.location!)}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          style={{ display: 'block', marginTop: 10 }}
        >
          <Btn size="sm" variant="ghost" icon="target" style={{ width: '100%', justifyContent: 'center' }}>
            Itinéraire
          </Btn>
        </a>
      )}
    </Card>
  );
}

export default DashboardPage;
