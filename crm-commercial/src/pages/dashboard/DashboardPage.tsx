import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardBody, Spinner, Table } from '../../components';
import { kpisService, leadsService, activitiesService } from '../../services';
import { appointmentsService } from '../../services/appointments.service';
import type { DashboardData, Lead, Activity, PipelineAnalysis } from '../../types';
import type { Appointment } from '../../types/appointment.types';
import {
  APPOINTMENT_TYPE_LABELS,
  APPOINTMENT_TYPE_COLORS,
  APPOINTMENT_TYPE_ICONS,
  APPOINTMENT_STATUS_LABELS,
  APPOINTMENT_STATUS_COLORS,
  LOCATION_TYPE_LABELS,
} from '../../types/appointment.types';
import { LEAD_STATUS_LABELS, ACTIVITY_TYPE_LABELS } from '../../types';
import { useAuthStore, useGamificationStore } from '../../stores';
import {
  XPProgressBar,
  StreakDisplay,
  DailyChallenges,
  MiniLeaderboard,
  RecentAchievements,
  QuickStats,
} from '../../components/gamification';

// Preparation steps for an appointment
interface PrepStep {
  id: string;
  label: string;
  icon: string;
  description: string;
}

const PREP_STEPS: PrepStep[] = [
  { id: 'review_client', label: 'Revoir le dossier client', icon: 'bi-person-lines-fill', description: 'Relisez les infos du lead/client et l\'historique des échanges' },
  { id: 'prepare_docs', label: 'Préparer les documents', icon: 'bi-file-earmark-text', description: 'Devis, brochures, contrats à jour' },
  { id: 'check_route', label: 'Vérifier l\'itinéraire', icon: 'bi-map', description: 'Estimez le temps de trajet et planifiez le départ' },
  { id: 'confirm_rdv', label: 'Confirmer le RDV', icon: 'bi-telephone', description: 'Rappelez le client pour confirmer l\'heure et le lieu' },
  { id: 'prepare_pitch', label: 'Préparer l\'argumentaire', icon: 'bi-chat-square-text', description: 'Points clés à aborder, objections anticipées' },
];

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
  const now = new Date();
  return d.toDateString() === now.toDateString();
}

function isTomorrow(dateStr: string): boolean {
  const d = new Date(dateStr);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return d.toDateString() === tomorrow.toDateString();
}

export function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const gamification = useGamificationStore();
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [pipeline, setPipeline] = useState<PipelineAnalysis | null>(null);
  const [recentLeads, setRecentLeads] = useState<Lead[]>([]);
  const [upcomingActivities, setUpcomingActivities] = useState<Activity[]>([]);
  const [upcomingAppointments, setUpcomingAppointments] = useState<Appointment[]>([]);
  const [checkedSteps, setCheckedSteps] = useState<Record<string, Set<string>>>({});

  useEffect(() => {
    loadData();
  }, []);

  // Load saved preparation progress from localStorage
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
    } catch { /* ignore */ }
  }, []);

  const saveCheckedSteps = (steps: Record<string, Set<string>>) => {
    const serializable: Record<string, string[]> = {};
    for (const [k, v] of Object.entries(steps)) {
      serializable[k] = Array.from(v);
    }
    localStorage.setItem('neo-prep-steps', JSON.stringify(serializable));
  };

  const toggleStep = (appointmentId: string, stepId: string) => {
    setCheckedSteps(prev => {
      const updated = { ...prev };
      const set = new Set(prev[appointmentId] || []);
      if (set.has(stepId)) {
        set.delete(stepId);
      } else {
        set.add(stepId);
      }
      updated[appointmentId] = set;
      saveCheckedSteps(updated);
      return updated;
    });
  };

  const loadData = async () => {
    try {
      // Load all data in parallel, including appointments
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

      setDashboard(dashboardData);
      setPipeline(pipelineData);
      setRecentLeads(leadsData.data);

      const allActivities = await activitiesService.getActivities({}, 1, 100);
      setUpcomingActivities(activitiesData.slice(0, 5));

      // Filter appointments: only future, non-canceled, sorted by date
      const upcoming = appointmentsData
        .filter(a => a.status !== 'annule' && a.status !== 'no_show' && a.status !== 'termine' && new Date(a.scheduledAt) >= new Date(now.getTime() - 3600000))
        .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
      setUpcomingAppointments(upcoming);

      // Initialize gamification with real data
      const userName = user ? `${user.firstName} ${user.lastName}` : 'Utilisateur';
      const userInitials = user ? `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase() : '?';
      gamification.initialize(leadsData.data, allActivities.data, dashboardData, userName, userInitials);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
    });
  };

  const _formatFullDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
  };

  const _formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // The next appointment (most important one)
  const nextAppointment = upcomingAppointments[0] || null;
  // Other upcoming appointments (next 3)
  const otherAppointments = upcomingAppointments.slice(1, 4);

  if (loading) {
    return <Spinner />;
  }

  return (
    <div className="dashboard">
      {/* PRIORITY: Next Client Appointment */}
      {nextAppointment && (
        <div className="mb-4">
          <NextAppointmentCard
            appointment={nextAppointment}
            checkedSteps={checkedSteps[nextAppointment.id] || new Set()}
            onToggleStep={(stepId) => toggleStep(nextAppointment.id, stepId)}
            navigate={navigate}
          />
        </div>
      )}

      {/* Other upcoming appointments (compact) */}
      {otherAppointments.length > 0 && (
        <div className="row g-3 mb-4">
          {otherAppointments.map(apt => (
            <div key={apt.id} className="col-lg-4">
              <CompactAppointmentCard appointment={apt} navigate={navigate} />
            </div>
          ))}
        </div>
      )}

      {/* XP Progress Bar */}
      <div className="mb-4">
        <XPProgressBar />
      </div>

      {/* Gamification Row: Streak | Challenges | Leaderboard */}
      <div className="row g-3 mb-4">
        <div className="col-lg-3">
          <StreakDisplay />
        </div>
        <div className="col-lg-5">
          <DailyChallenges />
        </div>
        <div className="col-lg-4">
          <MiniLeaderboard />
        </div>
      </div>

      {/* Quick Stats */}
      <div className="mb-4">
        <QuickStats
          stats={[
            {
              label: 'Leads ouverts',
              value: dashboard?.leads.open || 0,
              icon: 'bi-funnel',
              color: 'var(--neo-primary)',
            },
            {
              label: 'Leads gagnés',
              value: dashboard?.leads.won || 0,
              icon: 'bi-trophy',
              color: 'var(--neo-success)',
            },
            {
              label: 'Taux conversion',
              value: dashboard?.leads.conversionRate || 0,
              icon: 'bi-graph-up-arrow',
              color: 'var(--neo-info)',
              suffix: '%',
            },
            {
              label: 'CA potentiel',
              value: dashboard?.revenue.weightedValue || 0,
              icon: 'bi-currency-euro',
              color: 'var(--neo-xp-color)',
              formatter: (v) => formatCurrency(v),
            },
          ]}
        />
      </div>

      <div className="row g-4 mb-4">
        {/* Pipeline Overview */}
        <div className="col-lg-8">
          <Card>
            <CardHeader>
              <div className="d-flex justify-content-between align-items-center">
                <span>Pipeline</span>
                <button className="btn btn-sm btn-outline-primary" onClick={() => navigate('/leads')}>
                  Voir tout
                </button>
              </div>
            </CardHeader>
            <CardBody>
              <div className="row g-3">
                {pipeline?.stages.map((stage) => (
                  <div key={stage.status} className="col-md-3">
                    <div className="text-center p-3 rounded" style={{ background: 'var(--neo-bg-light)' }}>
                      <div className="h4 mb-1">{stage.count}</div>
                      <div className="text-muted mb-2">{LEAD_STATUS_LABELS[stage.status as keyof typeof LEAD_STATUS_LABELS] || stage.status}</div>
                      <div className="small text-muted">{formatCurrency(stage.weightedValue)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Recent Achievements */}
        <div className="col-lg-4">
          <RecentAchievements />
        </div>
      </div>

      <div className="row g-4">
        {/* Recent Leads */}
        <div className="col-lg-6">
          <Card>
            <CardHeader>
              <div className="d-flex justify-content-between align-items-center">
                <span>Leads récents</span>
                <button className="btn btn-sm btn-outline-primary" onClick={() => navigate('/leads')}>
                  Voir tout
                </button>
              </div>
            </CardHeader>
            <CardBody className="p-0">
              <Table
                columns={[
                  { key: 'name', header: 'Nom', render: (lead: Lead) => `${lead.firstName} ${lead.lastName}` },
                  { key: 'title', header: 'Projet' },
                  {
                    key: 'status',
                    header: 'Statut',
                    render: (lead: Lead) => (
                      <span className={`badge badge-${lead.status}`}>
                        {LEAD_STATUS_LABELS[lead.status]}
                      </span>
                    ),
                  },
                  {
                    key: 'estimatedValue',
                    header: 'Valeur',
                    render: (lead: Lead) => lead.estimatedValue ? formatCurrency(parseFloat(lead.estimatedValue)) : '-',
                  },
                ]}
                data={recentLeads.slice(0, 5)}
                keyExtractor={(lead) => lead.id}
                onRowClick={(lead) => navigate(`/leads/${lead.id}`)}
                emptyMessage="Aucun lead récent"
              />
            </CardBody>
          </Card>
        </div>

        {/* Upcoming Activities */}
        <div className="col-lg-6">
          <Card>
            <CardHeader>
              <div className="d-flex justify-content-between align-items-center">
                <span>Activités à venir</span>
                <button className="btn btn-sm btn-outline-primary" onClick={() => navigate('/activities')}>
                  Voir tout
                </button>
              </div>
            </CardHeader>
            <CardBody className="p-0">
              <Table
                columns={[
                  {
                    key: 'type',
                    header: 'Type',
                    render: (activity: Activity) => (
                      <span className={`badge badge-${activity.type}`}>
                        {ACTIVITY_TYPE_LABELS[activity.type]}
                      </span>
                    ),
                  },
                  { key: 'subject', header: 'Sujet' },
                  {
                    key: 'scheduledAt',
                    header: 'Date',
                    render: (activity: Activity) => activity.scheduledAt ? formatDate(activity.scheduledAt) : '-',
                  },
                ]}
                data={upcomingActivities}
                keyExtractor={(activity) => activity.id}
                emptyMessage="Aucune activité planifiée"
              />
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ---------- Next Appointment Card (prominent) ----------

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
  const statusColor = APPOINTMENT_STATUS_COLORS[appointment.status];
  const timeLabel = getTimeUntil(appointment.scheduledAt);
  const todayFlag = isToday(appointment.scheduledAt);
  const tomorrowFlag = isTomorrow(appointment.scheduledAt);
  const hasSiteLocation = (appointment.locationType === 'sur_site' || appointment.locationType === 'bureau') && appointment.location;

  const completedSteps = checkedSteps.size;
  const totalSteps = PREP_STEPS.length;
  const progressPct = Math.round((completedSteps / totalSteps) * 100);

  const urgencyBg = todayFlag
    ? 'linear-gradient(135deg, rgba(220, 53, 69, 0.08), rgba(220, 53, 69, 0.02))'
    : tomorrowFlag
    ? 'linear-gradient(135deg, rgba(255, 193, 7, 0.08), rgba(255, 193, 7, 0.02))'
    : 'var(--neo-bg-card)';

  const urgencyBorder = todayFlag
    ? '2px solid rgba(220, 53, 69, 0.3)'
    : tomorrowFlag
    ? '2px solid rgba(255, 193, 7, 0.3)'
    : '2px solid var(--neo-primary)';

  return (
    <Card style={{ border: urgencyBorder, background: urgencyBg }}>
      <CardBody className="p-0">
        <div className="row g-0">
          {/* Left: Appointment Info */}
          <div className="col-lg-7 p-4">
            <div className="d-flex align-items-center gap-2 mb-3">
              {todayFlag && (
                <span className="badge bg-danger" style={{ fontSize: '0.75rem', animation: 'pulse 2s infinite' }}>
                  <i className="bi bi-exclamation-circle me-1"></i>
                  AUJOURD'HUI
                </span>
              )}
              {tomorrowFlag && (
                <span className="badge bg-warning text-dark" style={{ fontSize: '0.75rem' }}>
                  <i className="bi bi-clock me-1"></i>
                  DEMAIN
                </span>
              )}
              <span className="badge" style={{ backgroundColor: statusColor, color: '#fff', fontSize: '0.75rem' }}>
                {APPOINTMENT_STATUS_LABELS[appointment.status]}
              </span>
              <span className="text-muted" style={{ fontSize: '0.85rem', fontWeight: 500 }}>
                {timeLabel}
              </span>
            </div>

            <div className="d-flex align-items-center gap-3 mb-3">
              <div
                className="d-flex align-items-center justify-content-center rounded"
                style={{
                  width: 52,
                  height: 52,
                  backgroundColor: typeColor,
                  color: '#fff',
                  fontSize: '1.4rem',
                  flexShrink: 0,
                }}
              >
                <i className={`bi ${APPOINTMENT_TYPE_ICONS[appointment.type]}`}></i>
              </div>
              <div>
                <h4 className="mb-1" style={{ fontWeight: 700, fontSize: '1.25rem' }}>
                  {appointment.title}
                </h4>
                <div className="d-flex align-items-center gap-3 flex-wrap" style={{ fontSize: '0.9rem' }}>
                  <span style={{ color: typeColor, fontWeight: 500 }}>
                    {APPOINTMENT_TYPE_LABELS[appointment.type]}
                  </span>
                  {appointment.lead && (
                    <span
                      className="d-flex align-items-center gap-1"
                      style={{ cursor: 'pointer', color: 'var(--neo-primary)' }}
                      onClick={() => navigate(`/leads/${appointment.lead!.id}`)}
                    >
                      <i className="bi bi-person"></i>
                      {appointment.lead.firstName} {appointment.lead.lastName}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Date/Time/Location Row */}
            <div className="d-flex flex-wrap gap-4 mb-3" style={{ fontSize: '0.9rem' }}>
              <div className="d-flex align-items-center gap-2">
                <i className="bi bi-calendar3" style={{ color: 'var(--neo-text-secondary)' }}></i>
                <span style={{ fontWeight: 500 }}>
                  {new Date(appointment.scheduledAt).toLocaleDateString('fr-FR', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                  })}
                </span>
              </div>
              <div className="d-flex align-items-center gap-2">
                <i className="bi bi-clock" style={{ color: 'var(--neo-text-secondary)' }}></i>
                <span style={{ fontWeight: 500 }}>
                  {new Date(appointment.scheduledAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  {' - '}
                  {new Date(appointment.endAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </span>
                <span className="text-muted">({appointment.duration} min)</span>
              </div>
              <div className="d-flex align-items-center gap-2">
                <i className={`bi ${
                  appointment.locationType === 'visio' ? 'bi-camera-video' :
                  appointment.locationType === 'telephone' ? 'bi-telephone' :
                  appointment.locationType === 'bureau' ? 'bi-building' : 'bi-geo-alt'
                }`} style={{ color: 'var(--neo-text-secondary)' }}></i>
                <span>{LOCATION_TYPE_LABELS[appointment.locationType]}</span>
                {appointment.location && (
                  <span className="text-muted">{appointment.location}</span>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="d-flex flex-wrap gap-2">
              <button
                className="btn btn-primary btn-sm"
                onClick={() => navigate(`/calendar/${appointment.id}`)}
              >
                <i className="bi bi-eye me-1"></i>
                Voir le RDV
              </button>

              {hasSiteLocation && (
                <a
                  href={getGoogleMapsDirectionsUrl(appointment.location!)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-sm btn-outline-primary"
                >
                  <i className="bi bi-map me-1"></i>
                  Itinéraire
                </a>
              )}

              {appointment.lead && (
                <button
                  className="btn btn-sm btn-outline-secondary"
                  onClick={() => navigate(`/leads/${appointment.lead!.id}`)}
                >
                  <i className="bi bi-person me-1"></i>
                  Dossier client
                </button>
              )}
            </div>
          </div>

          {/* Right: Preparation Checklist */}
          <div className="col-lg-5" style={{ borderLeft: '1px solid var(--neo-border-color)' }}>
            <div className="p-4">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h6 className="mb-0" style={{ fontWeight: 600 }}>
                  <i className="bi bi-list-check me-2"></i>
                  Préparation
                </h6>
                <span
                  className="badge"
                  style={{
                    backgroundColor: progressPct === 100 ? 'var(--neo-success)' : 'var(--neo-primary)',
                    color: '#fff',
                    fontSize: '0.75rem',
                  }}
                >
                  {completedSteps}/{totalSteps}
                </span>
              </div>

              {/* Progress bar */}
              <div className="progress mb-3" style={{ height: 6 }}>
                <div
                  className="progress-bar"
                  style={{
                    width: `${progressPct}%`,
                    backgroundColor: progressPct === 100 ? 'var(--neo-success)' : 'var(--neo-primary)',
                    transition: 'width 0.3s ease',
                  }}
                />
              </div>

              {/* Steps */}
              <div className="d-flex flex-column gap-2">
                {PREP_STEPS.map(step => {
                  const checked = checkedSteps.has(step.id);
                  // For "check_route" step, add special behavior if we have a location
                  const isRouteStep = step.id === 'check_route' && hasSiteLocation;

                  return (
                    <div
                      key={step.id}
                      className="d-flex align-items-start gap-2 rounded p-2"
                      style={{
                        cursor: 'pointer',
                        background: checked ? 'rgba(25, 135, 84, 0.06)' : 'transparent',
                        transition: 'background 0.2s',
                      }}
                      onClick={() => onToggleStep(step.id)}
                    >
                      <div className="flex-shrink-0 mt-1">
                        <input
                          type="checkbox"
                          className="form-check-input"
                          checked={checked}
                          onChange={() => onToggleStep(step.id)}
                          onClick={(e) => e.stopPropagation()}
                          style={{ cursor: 'pointer' }}
                        />
                      </div>
                      <div className="flex-grow-1">
                        <div
                          style={{
                            fontWeight: 500,
                            fontSize: '0.875rem',
                            textDecoration: checked ? 'line-through' : 'none',
                            opacity: checked ? 0.6 : 1,
                          }}
                        >
                          <i className={`bi ${step.icon} me-1`} style={{ fontSize: '0.8rem', color: 'var(--neo-text-secondary)' }}></i>
                          {step.label}
                        </div>
                        <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                          {step.description}
                        </div>
                        {isRouteStep && !checked && (
                          <a
                            href={getGoogleMapsDirectionsUrl(appointment.location!)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-outline-primary btn-sm mt-1"
                            style={{ fontSize: '0.75rem', padding: '2px 8px' }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <i className="bi bi-map me-1"></i>
                            Voir l'itinéraire
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {progressPct === 100 && (
                <div className="text-center mt-3 p-2 rounded" style={{ background: 'rgba(25, 135, 84, 0.08)' }}>
                  <i className="bi bi-check-circle-fill me-1" style={{ color: 'var(--neo-success)' }}></i>
                  <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--neo-success)' }}>
                    Préparation terminée !
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardBody>
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
  const hasSiteLocation = (appointment.locationType === 'sur_site' || appointment.locationType === 'bureau') && appointment.location;
  const todayFlag = isToday(appointment.scheduledAt);

  return (
    <Card
      style={{ cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s' }}
      className="h-100"
      onClick={() => navigate(`/calendar/${appointment.id}`)}
    >
      <CardBody className="p-3">
        <div className="d-flex align-items-center gap-2 mb-2">
          <div
            className="d-flex align-items-center justify-content-center rounded"
            style={{
              width: 32,
              height: 32,
              backgroundColor: typeColor,
              color: '#fff',
              fontSize: '0.9rem',
              flexShrink: 0,
            }}
          >
            <i className={`bi ${APPOINTMENT_TYPE_ICONS[appointment.type]}`}></i>
          </div>
          <div className="flex-grow-1 overflow-hidden">
            <div style={{ fontWeight: 600, fontSize: '0.9rem' }} className="text-truncate">
              {appointment.title}
            </div>
          </div>
          {todayFlag && (
            <span className="badge bg-danger" style={{ fontSize: '0.65rem' }}>Auj.</span>
          )}
        </div>

        <div className="d-flex flex-column gap-1" style={{ fontSize: '0.8rem' }}>
          <div className="d-flex align-items-center gap-2 text-muted">
            <i className="bi bi-calendar3"></i>
            <span>
              {new Date(appointment.scheduledAt).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
              {' '}
              {new Date(appointment.scheduledAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          {appointment.lead && (
            <div className="d-flex align-items-center gap-2 text-muted">
              <i className="bi bi-person"></i>
              <span>{appointment.lead.firstName} {appointment.lead.lastName}</span>
            </div>
          )}
          {appointment.location && (
            <div className="d-flex align-items-center gap-2 text-muted">
              <i className="bi bi-geo-alt"></i>
              <span className="text-truncate">{appointment.location}</span>
            </div>
          )}
        </div>

        {hasSiteLocation && (
          <div className="mt-2">
            <a
              href={getGoogleMapsDirectionsUrl(appointment.location!)}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-outline-primary btn-sm w-100"
              style={{ fontSize: '0.75rem' }}
              onClick={(e) => e.stopPropagation()}
            >
              <i className="bi bi-map me-1"></i>
              Itinéraire
            </a>
          </div>
        )}
      </CardBody>
    </Card>
  );
}

export default DashboardPage;
