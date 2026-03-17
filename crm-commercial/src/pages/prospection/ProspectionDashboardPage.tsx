import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardBody, Spinner } from '../../components';
import { leadsService, activitiesService } from '../../services';
import type { Lead, Activity } from '../../types';
import { useProspectionStore } from '../../stores';
import { QuickStats } from '../../components/gamification';
import { SuggestionsList, FunnelChart, HotColdList } from '../../components/prospection';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export function ProspectionDashboardPage() {
  const navigate = useNavigate();
  const prospection = useProspectionStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [leadsData, activitiesData] = await Promise.all([
        leadsService.getLeads({}, 1, 200),
        activitiesService.getActivities({}, 1, 500),
      ]);
      setLeads(leadsData.data);
      setActivities(activitiesData.data);
      prospection.initialize(leadsData.data, activitiesData.data);
    } catch (err) {
      console.error('Failed to load prospection data:', err);
      setError('Impossible de charger les données. Vérifiez votre connexion.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <Spinner />;
  }

  if (error) {
    return (
      <div className="d-flex flex-column align-items-center justify-content-center" style={{ minHeight: '50vh' }}>
        <i className="bi bi-exclamation-triangle text-warning" style={{ fontSize: '3rem' }}></i>
        <p className="mt-3 text-muted">{error}</p>
        <button className="btn btn-primary" onClick={() => { setError(null); setLoading(true); loadData(); }}>
          <i className="bi bi-arrow-clockwise me-2"></i>Réessayer
        </button>
      </div>
    );
  }

  if (!prospection.stats) {
    return (
      <div className="d-flex flex-column align-items-center justify-content-center" style={{ minHeight: '50vh' }}>
        <i className="bi bi-inbox text-muted" style={{ fontSize: '3rem' }}></i>
        <p className="mt-3 text-muted">Aucune donnée de prospection disponible.</p>
        <button className="btn btn-primary" onClick={() => navigate('/leads/new')}>
          <i className="bi bi-plus-lg me-2"></i>Créer un premier lead
        </button>
      </div>
    );
  }

  const stats = prospection.stats;

  // Pipeline funnel data
  const statusOrder = ['prospect', 'qualifie', 'proposition', 'negociation', 'gagne'];
  const statusColors: Record<string, string> = {
    prospect: 'var(--neo-status-prospect)',
    qualifie: 'var(--neo-status-qualifie)',
    proposition: 'var(--neo-status-proposition)',
    negociation: 'var(--neo-status-negociation)',
    gagne: 'var(--neo-status-gagne)',
  };
  const statusLabels: Record<string, string> = {
    prospect: 'Prospect', qualifie: 'Qualifié', proposition: 'Proposition',
    negociation: 'Négociation', gagne: 'Gagné',
  };
  const stageCounts = statusOrder.map(status => ({
    label: statusLabels[status],
    count: leads.filter(l => l.status === status).length,
    color: statusColors[status],
  }));

  // Source performance chart data
  const sourceChartData = stats.bestSources.map(s => ({
    name: s.label,
    score: s.avgScore,
    count: s.count,
  }));

  return (
    <div className="prospection-dashboard">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h5 style={{ margin: 0, fontWeight: 600 }}>
            <i className="bi bi-crosshair me-2" style={{ color: 'var(--neo-accent)' }}></i>
            Prospection
          </h5>
          <p style={{ margin: 0, color: 'var(--neo-text-secondary)', fontSize: '0.85rem' }}>
            Vue d'ensemble de vos prospects et actions recommandées
          </p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => navigate('/prospection/qualify')}
          style={{
            background: 'linear-gradient(135deg, var(--neo-accent), var(--neo-primary))',
            border: 'none',
          }}
        >
          <i className="bi bi-plus-lg me-1"></i>
          Nouveau prospect
        </button>
      </div>

      {/* Quick Stats */}
      <div className="mb-4">
        <QuickStats
          stats={[
            {
              label: 'Prospects actifs',
              value: stats.totalProspects,
              icon: 'bi-people',
              color: 'var(--neo-primary)',
            },
            {
              label: 'Leads chauds',
              value: stats.hotLeads,
              icon: 'bi-fire',
              color: '#ef4444',
            },
            {
              label: 'Leads froids',
              value: stats.coldLeads,
              icon: 'bi-snow',
              color: '#0dcaf0',
            },
            {
              label: 'Score moyen',
              value: stats.avgScore,
              icon: 'bi-speedometer2',
              color: 'var(--neo-accent)',
              suffix: '/100',
            },
          ]}
        />
      </div>

      {/* Row: Funnel + Suggestions */}
      <div className="row g-4 mb-4">
        <div className="col-lg-7">
          <Card className="h-100">
            <CardHeader>
              <div className="d-flex justify-content-between align-items-center">
                <span>
                  <i className="bi bi-funnel me-2"></i>
                  Entonnoir de conversion
                </span>
                <button
                  className="btn btn-sm btn-outline-primary"
                  onClick={() => navigate('/leads')}
                >
                  Pipeline →
                </button>
              </div>
            </CardHeader>
            <CardBody>
              <FunnelChart stats={stats} stageCounts={stageCounts} />
            </CardBody>
          </Card>
        </div>
        <div className="col-lg-5">
          <Card className="h-100">
            <CardHeader>
              <i className="bi bi-lightbulb me-2" style={{ color: 'var(--neo-xp-color)' }}></i>
              Actions prioritaires
            </CardHeader>
            <CardBody>
              <SuggestionsList
                suggestions={prospection.suggestions}
                title=""
                maxItems={6}
              />
            </CardBody>
          </Card>
        </div>
      </div>

      {/* Row: Hot/Cold + Source Performance */}
      <div className="row g-4 mb-4">
        <div className="col-lg-6">
          <Card className="h-100">
            <CardHeader>
              <i className="bi bi-thermometer-half me-2"></i>
              Température des leads
            </CardHeader>
            <CardBody>
              <HotColdList leads={leads} activities={activities} />
            </CardBody>
          </Card>
        </div>
        <div className="col-lg-6">
          <Card className="h-100">
            <CardHeader>
              <i className="bi bi-bar-chart me-2"></i>
              Performance par source
            </CardHeader>
            <CardBody>
              {sourceChartData.length > 0 ? (
                <div style={{ height: '280px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={sourceChartData} layout="vertical">
                      <XAxis type="number" domain={[0, 100]}
                        tick={{ fill: 'var(--neo-text-muted)', fontSize: 11 }}
                        axisLine={false} tickLine={false}
                      />
                      <YAxis dataKey="name" type="category" width={100}
                        tick={{ fill: 'var(--neo-text-secondary)', fontSize: 12 }}
                        axisLine={false} tickLine={false}
                      />
                      <Tooltip
                        contentStyle={{
                          background: 'var(--neo-bg-card)',
                          border: '1px solid var(--neo-border-color)',
                          borderRadius: '8px',
                          color: 'var(--neo-text-primary)',
                        }}
                        formatter={(value, name) => {
                          if (name === 'score') return [`${Number(value)}/100`, 'Score moyen'];
                          return [`${value}`, 'Leads'];
                        }}
                      />
                      <Bar dataKey="score" fill="var(--neo-accent)" radius={[0, 4, 4, 0]} barSize={20} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div style={{
                  textAlign: 'center',
                  padding: '40px',
                  color: 'var(--neo-text-muted)',
                }}>
                  Pas assez de données
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      </div>

      {/* All Suggestions */}
      {prospection.suggestions.length > 6 && (
        <Card>
          <CardHeader>
            Toutes les actions suggérées ({prospection.suggestions.length})
          </CardHeader>
          <CardBody>
            <SuggestionsList
              suggestions={prospection.suggestions}
              title=""
            />
          </CardBody>
        </Card>
      )}
    </div>
  );
}

export default ProspectionDashboardPage;
