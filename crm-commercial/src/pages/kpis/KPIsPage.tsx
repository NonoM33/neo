import { useEffect, useState } from 'react';
import { Card, CardHeader, CardBody, Spinner, StatCard } from '../../components';
import { kpisService } from '../../services';
import type { DashboardData, PipelineAnalysis, ConversionStats, ActivityMetrics, ObjectiveWithProgress } from '../../types';
import { LEAD_STATUS_LABELS, ACTIVITY_TYPE_LABELS } from '../../types';

export function KPIsPage() {
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [pipeline, setPipeline] = useState<PipelineAnalysis | null>(null);
  const [conversions, setConversions] = useState<ConversionStats | null>(null);
  const [activities, setActivities] = useState<ActivityMetrics | null>(null);
  const [objectives, setObjectives] = useState<ObjectiveWithProgress[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [dashboardData, pipelineData, conversionsData, activitiesData, objectivesData] = await Promise.all([
        kpisService.getDashboard(),
        kpisService.getPipeline(),
        kpisService.getConversions(),
        kpisService.getActivityMetrics(),
        kpisService.getObjectives(),
      ]);

      setDashboard(dashboardData);
      setPipeline(pipelineData);
      setConversions(conversionsData);
      setActivities(activitiesData);
      setObjectives(objectivesData);
    } catch (error) {
      console.error('Failed to load KPI data:', error);
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

  const formatPercent = (value: number | null) => {
    if (value === null) return '-';
    return `${value.toFixed(1)}%`;
  };

  if (loading) {
    return <Spinner />;
  }

  return (
    <div className="kpis-page">
      {/* Main Stats */}
      <div className="row g-4 mb-4">
        <div className="col-md-6 col-xl-3">
          <StatCard
            label="Total leads"
            value={dashboard?.leads.total || 0}
            icon="bi-people"
            color="primary"
          />
        </div>
        <div className="col-md-6 col-xl-3">
          <StatCard
            label="Leads gagnés"
            value={dashboard?.leads.won || 0}
            icon="bi-trophy"
            color="success"
          />
        </div>
        <div className="col-md-6 col-xl-3">
          <StatCard
            label="Taux de conversion"
            value={formatPercent(dashboard?.leads.conversionRate || 0)}
            icon="bi-graph-up-arrow"
            color="info"
          />
        </div>
        <div className="col-md-6 col-xl-3">
          <StatCard
            label="CA réalisé"
            value={formatCurrency(dashboard?.revenue.totalValue || 0)}
            icon="bi-currency-euro"
            color="success"
          />
        </div>
      </div>

      <div className="row g-4 mb-4">
        {/* Pipeline Analysis */}
        <div className="col-lg-6">
          <Card className="h-100">
            <CardHeader>Analyse du Pipeline</CardHeader>
            <CardBody>
              {pipeline?.stages.map((stage) => (
                <div key={stage.status} className="mb-3">
                  <div className="d-flex justify-content-between mb-1">
                    <span>{LEAD_STATUS_LABELS[stage.status as keyof typeof LEAD_STATUS_LABELS] || stage.status}</span>
                    <span className="text-muted">{stage.count} leads</span>
                  </div>
                  <div className="progress progress-neo">
                    <div
                      className={`progress-bar badge-${stage.status}`}
                      role="progressbar"
                      style={{ width: `${(stage.count / (pipeline.totals.count || 1)) * 100}%` }}
                    ></div>
                  </div>
                  <div className="d-flex justify-content-between mt-1">
                    <small className="text-muted">Valeur: {formatCurrency(stage.totalValue)}</small>
                    <small className="text-muted">Pond.: {formatCurrency(stage.weightedValue)}</small>
                  </div>
                </div>
              ))}
              <hr />
              <div className="d-flex justify-content-between">
                <strong>Total Pipeline</strong>
                <strong>{formatCurrency(pipeline?.totals.weightedValue || 0)}</strong>
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Conversion by Source */}
        <div className="col-lg-6">
          <Card className="h-100">
            <CardHeader>Conversions par source</CardHeader>
            <CardBody>
              {conversions?.bySource.map((source) => (
                <div key={source.source} className="d-flex align-items-center justify-content-between mb-3 pb-3 border-bottom">
                  <div>
                    <div className="fw-semibold">{source.source}</div>
                    <small className="text-muted">{source.total} leads, {source.won} gagnés</small>
                  </div>
                  <div className="text-end">
                    <div className="h5 mb-0 text-primary">{formatPercent(source.conversionRate)}</div>
                    <small className="text-muted">{formatCurrency(source.revenue)}</small>
                  </div>
                </div>
              ))}
              <div className="d-flex justify-content-between align-items-center">
                <strong>Taux global</strong>
                <span className="h5 mb-0 text-success">{formatPercent(conversions?.overall.conversionRate || 0)}</span>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>

      <div className="row g-4 mb-4">
        {/* Activity Metrics */}
        <div className="col-lg-6">
          <Card className="h-100">
            <CardHeader>Activités par type</CardHeader>
            <CardBody>
              <div className="table-responsive">
                <table className="table table-sm mb-0">
                  <thead>
                    <tr>
                      <th>Type</th>
                      <th className="text-center">Total</th>
                      <th className="text-center">Terminées</th>
                      <th className="text-end">Durée totale</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activities?.byType.map((item) => (
                      <tr key={item.type}>
                        <td>
                          <span className={`badge badge-${item.type}`}>
                            {ACTIVITY_TYPE_LABELS[item.type as keyof typeof ACTIVITY_TYPE_LABELS] || item.type}
                          </span>
                        </td>
                        <td className="text-center">{item.total}</td>
                        <td className="text-center">{item.completed}</td>
                        <td className="text-end">
                          {Math.round(item.totalDurationMinutes / 60)}h
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Objectives Progress */}
        <div className="col-lg-6">
          <Card className="h-100">
            <CardHeader>Progression des objectifs</CardHeader>
            <CardBody>
              {objectives.length > 0 ? (
                objectives.slice(0, 3).map((obj) => (
                  <div key={obj.objective.id} className="mb-4">
                    <div className="d-flex justify-content-between mb-2">
                      <span className="fw-semibold">
                        {obj.objective.month
                          ? new Date(obj.objective.year, obj.objective.month - 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
                          : obj.objective.quarter
                          ? `T${obj.objective.quarter} ${obj.objective.year}`
                          : obj.objective.year}
                      </span>
                    </div>
                    <div className="row g-2">
                      {obj.progress.revenue.target !== null && (
                        <div className="col-6">
                          <small className="text-muted d-block">CA</small>
                          <div className="progress progress-neo">
                            <div
                              className="progress-bar bg-success"
                              style={{ width: `${Math.min(obj.progress.revenue.percentage || 0, 100)}%` }}
                            ></div>
                          </div>
                          <small>{formatPercent(obj.progress.revenue.percentage)}</small>
                        </div>
                      )}
                      {obj.progress.leads.target !== null && (
                        <div className="col-6">
                          <small className="text-muted d-block">Leads</small>
                          <div className="progress progress-neo">
                            <div
                              className="progress-bar bg-primary"
                              style={{ width: `${Math.min(obj.progress.leads.percentage || 0, 100)}%` }}
                            ></div>
                          </div>
                          <small>{formatPercent(obj.progress.leads.percentage)}</small>
                        </div>
                      )}
                      {obj.progress.conversions.target !== null && (
                        <div className="col-6">
                          <small className="text-muted d-block">Conversions</small>
                          <div className="progress progress-neo">
                            <div
                              className="progress-bar bg-warning"
                              style={{ width: `${Math.min(obj.progress.conversions.percentage || 0, 100)}%` }}
                            ></div>
                          </div>
                          <small>{formatPercent(obj.progress.conversions.percentage)}</small>
                        </div>
                      )}
                      {obj.progress.activities.target !== null && (
                        <div className="col-6">
                          <small className="text-muted d-block">Activités</small>
                          <div className="progress progress-neo">
                            <div
                              className="progress-bar bg-info"
                              style={{ width: `${Math.min(obj.progress.activities.percentage || 0, 100)}%` }}
                            ></div>
                          </div>
                          <small>{formatPercent(obj.progress.activities.percentage)}</small>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-muted py-4">
                  <i className="bi bi-bullseye fs-2 mb-2"></i>
                  <p className="mb-0">Aucun objectif défini</p>
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default KPIsPage;
