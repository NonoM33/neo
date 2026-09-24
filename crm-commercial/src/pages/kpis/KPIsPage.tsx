import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Spinner } from '../../components';
import { Btn, Card, Icon } from '../../components/neo';
import type { IconName } from '../../components/neo';
import { kpisService } from '../../services';
import type {
  DashboardData,
  PipelineAnalysis,
  ConversionStats,
  ActivityMetrics,
  ObjectiveWithProgress,
  LeadStatus,
} from '../../types';
import { LEAD_STATUS_LABELS, ACTIVITY_TYPE_LABELS } from '../../types';

const STAGE_COLOR: Record<LeadStatus, string> = {
  prospect: 'var(--ink-3)',
  qualifie: 'var(--komun)',
  proposition: 'var(--ochre)',
  negociation: 'var(--warning)',
  gagne: 'var(--success)',
  perdu: 'var(--danger)',
};

export function KPIsPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [pipeline, setPipeline] = useState<PipelineAnalysis | null>(null);
  const [conversions, setConversions] = useState<ConversionStats | null>(null);
  const [activities, setActivities] = useState<ActivityMetrics | null>(null);
  const [objectives, setObjectives] = useState<ObjectiveWithProgress[]>([]);

  useEffect(() => {
    let cancelled = false;
    const loadData = async () => {
      try {
        const [dashboardData, pipelineData, conversionsData, activitiesData, objectivesData] =
          await Promise.all([
            kpisService.getDashboard(),
            kpisService.getPipeline(),
            kpisService.getConversions(),
            kpisService.getActivityMetrics(),
            kpisService.getObjectives(),
          ]);
        if (cancelled) return;
        setDashboard(dashboardData);
        setPipeline(pipelineData);
        setConversions(conversionsData);
        setActivities(activitiesData);
        setObjectives(objectivesData);
      } catch (error) {
        console.error('Failed to load KPI data:', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    loadData();
    return () => {
      cancelled = true;
    };
  }, []);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
    }).format(value);

  const formatPercent = (value: number | null) =>
    value === null ? '-' : `${value.toFixed(1)}%`;

  if (loading) {
    return <Spinner />;
  }

  const stats: { icon: IconName; tone: string; val: string; label: string }[] = [
    { icon: 'users', tone: 'blue', val: String(dashboard?.leads.total ?? 0), label: 'Total leads' },
    { icon: 'trophy', tone: 'green', val: String(dashboard?.leads.won ?? 0), label: 'Leads gagnés' },
    {
      icon: 'chart',
      tone: 'ink',
      val: formatPercent(dashboard?.leads.conversionRate ?? 0),
      label: 'Taux de conversion',
    },
    {
      icon: 'euro',
      tone: 'ochre',
      val: formatCurrency(dashboard?.revenue.totalValue ?? 0),
      label: 'CA réalisé',
    },
  ];

  const pipelineTotal = pipeline?.totals.count || 1;

  return (
    <div className="kpis-page">
      <div className="page-head">
        <div className="ph-l">
          <h1>Indicateurs de performance</h1>
          <p>Vue d'ensemble de votre activité commerciale</p>
        </div>
        <div className="page-actions">
          <Btn icon="plus" onClick={() => navigate('/leads/new')}>
            Nouveau lead
          </Btn>
        </div>
      </div>

      <div className="stat-grid mb-22" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
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

      <div className="grid-2 mb-22">
        <Card head="Analyse du pipeline" icon="filter">
          <div className="funnel">
            {pipeline?.stages.map((stage) => {
              const status = stage.status as LeadStatus;
              const pct = (stage.count / pipelineTotal) * 100;
              return (
                <div className="funnel-row" key={stage.status}>
                  <span className="fl">
                    {LEAD_STATUS_LABELS[status] || stage.status}
                  </span>
                  <div
                    className="funnel-bar"
                    style={{
                      width: `${Math.max(pct, 8)}%`,
                      background: STAGE_COLOR[status] ?? 'var(--komun)',
                    }}
                  >
                    {stage.count}
                  </div>
                  <span
                    style={{
                      marginLeft: 'auto',
                      fontFamily: 'var(--font-mono)',
                      fontSize: 12.5,
                      color: 'var(--ink-3)',
                    }}
                  >
                    {formatCurrency(stage.weightedValue)}
                  </span>
                </div>
              );
            })}
            {!pipeline?.stages.length && <div className="empty">Pipeline vide</div>}
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginTop: 16,
              paddingTop: 14,
              borderTop: '1px solid var(--line)',
              fontWeight: 700,
            }}
          >
            <span>Total pondéré</span>
            <span style={{ fontFamily: 'var(--font-mono)' }}>
              {formatCurrency(pipeline?.totals.weightedValue || 0)}
            </span>
          </div>
        </Card>

        <Card head="Conversions par source" icon="chart">
          <div style={{ padding: '0 2px' }}>
            {conversions?.bySource.map((source) => (
              <div className="lrow" key={source.source}>
                <div className="lr-main">
                  <b>{source.source}</b>
                  <small>
                    {source.total} leads · {source.won} gagnés
                  </small>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 700, color: 'var(--komun)' }}>
                    {formatPercent(source.conversionRate)}
                  </div>
                  <small
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 12,
                      color: 'var(--ink-3)',
                    }}
                  >
                    {formatCurrency(source.revenue)}
                  </small>
                </div>
              </div>
            ))}
            {!conversions?.bySource.length && <div className="empty">Aucune donnée</div>}
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: 14,
              paddingTop: 14,
              borderTop: '1px solid var(--line)',
              fontWeight: 700,
            }}
          >
            <span>Taux global</span>
            <span style={{ color: 'var(--success)', fontSize: 16 }}>
              {formatPercent(conversions?.overall.conversionRate || 0)}
            </span>
          </div>
        </Card>
      </div>

      <div className="grid-2">
        <Card head="Activités par type" icon="calendar" flush>
          <div className="tbl-wrap" style={{ border: 'none', boxShadow: 'none' }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Total</th>
                  <th>Terminées</th>
                  <th>Durée</th>
                </tr>
              </thead>
              <tbody>
                {activities?.byType.map((item) => (
                  <tr key={item.type}>
                    <td className="t-main">
                      {ACTIVITY_TYPE_LABELS[item.type as keyof typeof ACTIVITY_TYPE_LABELS] ||
                        item.type}
                    </td>
                    <td className="t-mono">{item.total}</td>
                    <td className="t-mono">{item.completed}</td>
                    <td className="t-mono">{Math.round(item.totalDurationMinutes / 60)}h</td>
                  </tr>
                ))}
                {!activities?.byType.length && (
                  <tr>
                    <td colSpan={4}>
                      <div className="empty">
                        <span className="em-ic">
                          <Icon name="calendar" size={20} />
                        </span>
                        <p>Aucune activité</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <Card head="Progression des objectifs" icon="trophy">
          {objectives.length > 0 ? (
            objectives.slice(0, 3).map((obj) => {
              const label = obj.objective.month
                ? new Date(obj.objective.year, obj.objective.month - 1).toLocaleDateString('fr-FR', {
                    month: 'long',
                    year: 'numeric',
                  })
                : obj.objective.quarter
                ? `T${obj.objective.quarter} ${obj.objective.year}`
                : String(obj.objective.year);

              const metrics: {
                key: string;
                label: string;
                pct: number | null;
                target: number | null;
                color: string;
              }[] = [
                {
                  key: 'revenue',
                  label: 'CA',
                  pct: obj.progress.revenue.percentage,
                  target: obj.progress.revenue.target,
                  color: 'var(--success)',
                },
                {
                  key: 'leads',
                  label: 'Leads',
                  pct: obj.progress.leads.percentage,
                  target: obj.progress.leads.target,
                  color: 'var(--komun)',
                },
                {
                  key: 'conversions',
                  label: 'Conversions',
                  pct: obj.progress.conversions.percentage,
                  target: obj.progress.conversions.target,
                  color: 'var(--warning)',
                },
                {
                  key: 'activities',
                  label: 'Activités',
                  pct: obj.progress.activities.percentage,
                  target: obj.progress.activities.target,
                  color: 'var(--ochre)',
                },
              ];

              return (
                <div key={obj.objective.id} style={{ marginBottom: 18 }}>
                  <div
                    style={{
                      fontWeight: 600,
                      fontSize: 13.5,
                      textTransform: 'capitalize',
                      marginBottom: 10,
                    }}
                  >
                    {label}
                  </div>
                  <div className="grid-2" style={{ gap: 12 }}>
                    {metrics
                      .filter((m) => m.target !== null)
                      .map((m) => (
                        <div key={m.key}>
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              fontSize: 12,
                              color: 'var(--ink-3)',
                            }}
                          >
                            <span>{m.label}</span>
                            <span>{formatPercent(m.pct)}</span>
                          </div>
                          <div className="mbar">
                            <i
                              style={{
                                width: `${Math.min(m.pct || 0, 100)}%`,
                                background: m.color,
                              }}
                            />
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="empty">
              <span className="em-ic">
                <Icon name="trophy" size={20} />
              </span>
              <p>Aucun objectif défini</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

export default KPIsPage;
