import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardBody, Spinner, Table } from '../../components';
import { kpisService, leadsService, activitiesService } from '../../services';
import type { DashboardData, Lead, Activity, PipelineAnalysis } from '../../types';
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

export function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const gamification = useGamificationStore();
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [pipeline, setPipeline] = useState<PipelineAnalysis | null>(null);
  const [recentLeads, setRecentLeads] = useState<Lead[]>([]);
  const [upcomingActivities, setUpcomingActivities] = useState<Activity[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [dashboardData, pipelineData, leadsData, activitiesData] = await Promise.all([
        kpisService.getDashboard(),
        kpisService.getPipeline(),
        leadsService.getLeads({}, 1, 100),
        activitiesService.getUpcoming(),
      ]);

      setDashboard(dashboardData);
      setPipeline(pipelineData);
      setRecentLeads(leadsData.data);

      const allActivities = await activitiesService.getActivities({}, 1, 100);
      setUpcomingActivities(activitiesData.slice(0, 5));

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

  if (loading) {
    return <Spinner />;
  }

  return (
    <div className="dashboard">
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

export default DashboardPage;
