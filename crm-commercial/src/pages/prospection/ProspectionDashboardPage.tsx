import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Spinner } from '../../components';
import { Card, Btn, Icon } from '../../components/neo';
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
      <div style={{ padding: 28 }}>
        <div className="empty">
          <span className="em-ic"><Icon name="zap" /></span>
          <b>{error}</b>
          <p>Réessayez dans un instant.</p>
          <div style={{ marginTop: 14 }}>
            <Btn icon="rocket" onClick={() => { setError(null); setLoading(true); loadData(); }}>
              Réessayer
            </Btn>
          </div>
        </div>
      </div>
    );
  }

  if (!prospection.stats) {
    return (
      <div style={{ padding: 28 }}>
        <div className="empty">
          <span className="em-ic"><Icon name="inbox" /></span>
          <b>Aucune donnée de prospection disponible.</b>
          <p>Commencez par créer un premier lead.</p>
          <div style={{ marginTop: 14 }}>
            <Btn icon="plus" onClick={() => navigate('/leads/new')}>
              Créer un premier lead
            </Btn>
          </div>
        </div>
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
    <div style={{ padding: 28 }}>
      {/* Header */}
      <div className="page-head">
        <div className="ph-l">
          <h1>Prospection</h1>
          <p>Vue d'ensemble de vos prospects et actions recommandées</p>
        </div>
        <div className="page-actions">
          <Btn icon="plus" onClick={() => navigate('/prospection/qualify')}>
            Nouveau prospect
          </Btn>
        </div>
      </div>

      {/* Quick Stats */}
      <div style={{ marginBottom: 18 }}>
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
      <div className="lead-grid" style={{ marginBottom: 18 }}>
        <Card
          head="Entonnoir de conversion"
          icon="filter"
          action={
            <Btn variant="subtle" size="sm" iconRight="arrowRight" onClick={() => navigate('/leads')}>
              Pipeline
            </Btn>
          }
        >
          <div className="card-body">
            <FunnelChart stats={stats} stageCounts={stageCounts} />
          </div>
        </Card>
        <Card head="Actions prioritaires" icon="sparkles">
          <div className="card-body">
            <SuggestionsList
              suggestions={prospection.suggestions}
              title=""
              maxItems={6}
            />
          </div>
        </Card>
      </div>

      {/* Row: Hot/Cold + Source Performance */}
      <div className="grid-2" style={{ marginBottom: 18 }}>
        <Card head="Température des leads" icon="flame">
          <div className="card-body">
            <HotColdList leads={leads} activities={activities} />
          </div>
        </Card>
        <Card head="Performance par source" icon="chart">
          <div className="card-body">
            {sourceChartData.length > 0 ? (
              <div style={{ height: '280px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={sourceChartData} layout="vertical">
                    <XAxis type="number" domain={[0, 100]}
                      tick={{ fill: 'var(--ink-4)', fontSize: 11 }}
                      axisLine={false} tickLine={false}
                    />
                    <YAxis dataKey="name" type="category" width={100}
                      tick={{ fill: 'var(--ink-3)', fontSize: 12 }}
                      axisLine={false} tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        background: 'var(--card)',
                        border: '1px solid var(--line)',
                        borderRadius: 'var(--r-sm)',
                        color: 'var(--ink)',
                      }}
                      formatter={(value, name) => {
                        if (name === 'score') return [`${Number(value)}/100`, 'Score moyen'];
                        return [`${value}`, 'Leads'];
                      }}
                    />
                    <Bar dataKey="score" fill="var(--ochre)" radius={[0, 4, 4, 0]} barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="empty">
                <span className="em-ic"><Icon name="chart" /></span>
                <b>Pas assez de données</b>
                <p>Les performances s'afficheront avec plus de leads.</p>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* All Suggestions */}
      {prospection.suggestions.length > 6 && (
        <Card head={`Toutes les actions suggérées (${prospection.suggestions.length})`} icon="target">
          <div className="card-body">
            <SuggestionsList
              suggestions={prospection.suggestions}
              title=""
            />
          </div>
        </Card>
      )}
    </div>
  );
}

export default ProspectionDashboardPage;
