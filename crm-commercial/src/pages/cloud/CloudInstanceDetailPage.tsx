import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardBody, Spinner, StatCard } from '../../components';
import { cloudService } from '../../services/cloud.service';
import { useUIStore } from '../../stores';
import type { CloudInstance, CloudInstanceStatus } from '../../types/cloud.types';

const STATUS_BADGE_MAP: Record<CloudInstanceStatus, string> = {
  provisioning: 'info',
  running: 'success',
  stopped: 'secondary',
  error: 'danger',
  destroying: 'warning',
};

const STATUS_LABELS: Record<CloudInstanceStatus, string> = {
  provisioning: 'Provisioning',
  running: 'En cours',
  stopped: 'Arrêtée',
  error: 'Erreur',
  destroying: 'Suppression',
};

function formatDateTime(dateStr?: string): string {
  if (!dateStr) return '-';
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(dateStr));
}

function computeUptime(provisionedAt?: string, status?: CloudInstanceStatus): string {
  if (!provisionedAt || status !== 'running') return '-';
  const now = new Date();
  const start = new Date(provisionedAt);
  const diffMs = now.getTime() - start.getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  if (days > 0) return `${days}j ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}min`;
  return `${minutes}min`;
}

export function CloudInstanceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addToast } = useUIStore();
  const [loading, setLoading] = useState(true);
  const [instance, setInstance] = useState<CloudInstance | null>(null);
  const [logs, setLogs] = useState('');
  const [logsLoading, setLogsLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const refreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadInstance = useCallback(async () => {
    if (!id) return;
    try {
      const data = await cloudService.getInstance(id);
      setInstance(data);
    } catch (error) {
      console.error('Failed to load instance:', error);
      addToast('error', 'Erreur lors du chargement de l\'instance');
    } finally {
      setLoading(false);
    }
  }, [id, addToast]);

  const loadLogs = useCallback(async () => {
    if (!id) return;
    setLogsLoading(true);
    try {
      const data = await cloudService.getInstanceLogs(id, 200);
      setLogs(data.logs);
      setTimeout(() => {
        logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (error) {
      console.error('Failed to load logs:', error);
    } finally {
      setLogsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadInstance();
    loadLogs();
  }, [loadInstance, loadLogs]);

  // Auto-refresh status every 10 seconds
  useEffect(() => {
    refreshIntervalRef.current = setInterval(() => {
      if (id) {
        cloudService.getInstanceStatus(id)
          .then((statusData) => {
            setInstance((prev) => prev ? { ...prev, status: statusData.status, isOnline: statusData.isOnline, lastHeartbeat: statusData.lastHeartbeat, entityCount: statusData.entityCount, automationCount: statusData.automationCount } : prev);
          })
          .catch(() => {
            // Silently fail on auto-refresh
          });
      }
    }, 10000);

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [id]);

  const handleAction = async (action: 'start' | 'stop' | 'restart' | 'destroy') => {
    if (!id) return;
    const labels: Record<string, string> = {
      start: 'Démarrage',
      stop: 'Arrêt',
      restart: 'Redémarrage',
      destroy: 'Suppression',
    };

    if (action === 'destroy') {
      if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette instance ? Cette action est irréversible.')) {
        return;
      }
    }

    setActionLoading(action);
    try {
      switch (action) {
        case 'start':
          await cloudService.startInstance(id);
          break;
        case 'stop':
          await cloudService.stopInstance(id);
          break;
        case 'restart':
          await cloudService.restartInstance(id);
          break;
        case 'destroy':
          await cloudService.destroyInstance(id);
          addToast('success', 'Instance supprimée');
          navigate('/cloud');
          return;
      }
      addToast('success', `${labels[action]} réussi`);
      await loadInstance();
    } catch (error) {
      console.error(`Failed to ${action} instance:`, error);
      addToast('error', `Erreur lors du ${labels[action].toLowerCase()}`);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return <Spinner />;
  }

  if (!instance) {
    return (
      <div className="text-center py-5" style={{ color: 'var(--neo-text-secondary)' }}>
        <i className="bi bi-cloud-slash fs-1 d-block mb-3"></i>
        <h4>Instance introuvable</h4>
        <button className="btn btn-primary mt-3" onClick={() => navigate('/cloud')}>
          <i className="bi bi-arrow-left me-2"></i>
          Retour aux instances
        </button>
      </div>
    );
  }

  return (
    <div className="cloud-instance-detail-page">
      {/* Back button + Header */}
      <div className="d-flex align-items-center gap-3 mb-4">
        <button className="btn btn-outline-secondary btn-sm" onClick={() => navigate('/cloud')}>
          <i className="bi bi-arrow-left"></i>
        </button>
        <div style={{ flex: 1 }}>
          <h1 className="page-title mb-0 d-flex align-items-center gap-3">
            <span>{instance.client.firstName} {instance.client.lastName}</span>
            <span className={`badge bg-${STATUS_BADGE_MAP[instance.status]}`} style={{ fontSize: '0.65em' }}>
              {STATUS_LABELS[instance.status]}
            </span>
            <span
              style={{
                display: 'inline-block',
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                background: instance.isOnline ? 'var(--neo-success)' : 'var(--neo-danger)',
                boxShadow: instance.isOnline ? '0 0 8px var(--neo-success)' : 'none',
              }}
              title={instance.isOnline ? 'En ligne' : 'Hors ligne'}
            />
          </h1>
          <div style={{ color: 'var(--neo-text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>
            <code style={{ color: 'var(--neo-text-primary)', background: 'var(--neo-bg-light, rgba(0,0,0,0.05))', padding: '2px 6px', borderRadius: '4px' }}>
              {instance.domain}
            </code>
            {instance.port && (
              <span className="ms-2">Port: {instance.port}</span>
            )}
          </div>
        </div>
      </div>

      {/* Quick Action Buttons */}
      <div className="d-flex gap-2 mb-4 flex-wrap">
        {instance.status === 'stopped' && (
          <button
            className="btn btn-success"
            onClick={() => handleAction('start')}
            disabled={!!actionLoading}
          >
            {actionLoading === 'start' ? (
              <span className="spinner-border spinner-border-sm me-2" role="status" />
            ) : (
              <i className="bi bi-play-fill me-2"></i>
            )}
            Démarrer
          </button>
        )}
        {instance.status === 'running' && (
          <>
            <button
              className="btn btn-warning"
              onClick={() => handleAction('stop')}
              disabled={!!actionLoading}
            >
              {actionLoading === 'stop' ? (
                <span className="spinner-border spinner-border-sm me-2" role="status" />
              ) : (
                <i className="bi bi-stop-fill me-2"></i>
              )}
              Arrêter
            </button>
            <button
              className="btn btn-info"
              onClick={() => handleAction('restart')}
              disabled={!!actionLoading}
            >
              {actionLoading === 'restart' ? (
                <span className="spinner-border spinner-border-sm me-2" role="status" />
              ) : (
                <i className="bi bi-arrow-clockwise me-2"></i>
              )}
              Redémarrer
            </button>
          </>
        )}
        <button
          className="btn btn-outline-danger"
          onClick={() => handleAction('destroy')}
          disabled={!!actionLoading}
        >
          {actionLoading === 'destroy' ? (
            <span className="spinner-border spinner-border-sm me-2" role="status" />
          ) : (
            <i className="bi bi-trash me-2"></i>
          )}
          Supprimer
        </button>

        {instance.domain && (
          <a
            href={`https://${instance.domain}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-outline-primary ms-auto"
          >
            <i className="bi bi-box-arrow-up-right me-2"></i>
            Ouvrir HA
          </a>
        )}
      </div>

      {/* Error message */}
      {instance.errorMessage && (
        <div className="alert alert-danger d-flex align-items-center gap-2 mb-4">
          <i className="bi bi-exclamation-triangle-fill"></i>
          <span>{instance.errorMessage}</span>
        </div>
      )}

      {/* Stats Row */}
      <div className="row g-3 mb-4">
        <div className="col-6 col-lg-3">
          <StatCard label="Entités" value={instance.entityCount} icon="bi-diagram-3" color="primary" />
        </div>
        <div className="col-6 col-lg-3">
          <StatCard label="Automations" value={instance.automationCount} icon="bi-gear-wide-connected" color="info" />
        </div>
        <div className="col-6 col-lg-3">
          <StatCard label="Uptime" value={computeUptime(instance.provisionedAt, instance.status)} icon="bi-clock-history" color="success" />
        </div>
        <div className="col-6 col-lg-3">
          <StatCard label="Mémoire" value={`${instance.memoryLimitMb} Mo`} icon="bi-memory" color="warning" />
        </div>
      </div>

      {/* Instance Details + Logs */}
      <div className="row g-4">
        {/* Instance Info */}
        <div className="col-lg-4">
          <Card>
            <CardHeader>
              <i className="bi bi-info-circle me-2"></i>
              Informations
            </CardHeader>
            <CardBody className="p-0">
              <table className="table table-borderless mb-0" style={{ fontSize: '0.9rem' }}>
                <tbody>
                  <tr>
                    <td style={{ color: 'var(--neo-text-secondary)', width: '40%' }}>Container</td>
                    <td style={{ color: 'var(--neo-text-primary)' }}>{instance.containerName || '-'}</td>
                  </tr>
                  <tr>
                    <td style={{ color: 'var(--neo-text-secondary)' }}>Version HA</td>
                    <td style={{ color: 'var(--neo-text-primary)' }}>{instance.haVersion || 'latest'}</td>
                  </tr>
                  <tr>
                    <td style={{ color: 'var(--neo-text-secondary)' }}>CPU</td>
                    <td style={{ color: 'var(--neo-text-primary)' }}>{instance.cpuLimit} core(s)</td>
                  </tr>
                  <tr>
                    <td style={{ color: 'var(--neo-text-secondary)' }}>Mémoire</td>
                    <td style={{ color: 'var(--neo-text-primary)' }}>{instance.memoryLimitMb} Mo</td>
                  </tr>
                  <tr>
                    <td style={{ color: 'var(--neo-text-secondary)' }}>Port</td>
                    <td style={{ color: 'var(--neo-text-primary)' }}>{instance.port || '-'}</td>
                  </tr>
                  <tr>
                    <td style={{ color: 'var(--neo-text-secondary)' }}>Créée le</td>
                    <td style={{ color: 'var(--neo-text-primary)' }}>{formatDateTime(instance.createdAt)}</td>
                  </tr>
                  <tr>
                    <td style={{ color: 'var(--neo-text-secondary)' }}>Provisionnée</td>
                    <td style={{ color: 'var(--neo-text-primary)' }}>{formatDateTime(instance.provisionedAt)}</td>
                  </tr>
                  <tr>
                    <td style={{ color: 'var(--neo-text-secondary)' }}>Dernier heartbeat</td>
                    <td style={{ color: 'var(--neo-text-primary)' }}>{formatDateTime(instance.lastHeartbeat)}</td>
                  </tr>
                </tbody>
              </table>
            </CardBody>
          </Card>

          {/* Client info */}
          <Card className="mt-4">
            <CardHeader>
              <i className="bi bi-person me-2"></i>
              Client
            </CardHeader>
            <CardBody>
              <div className="mb-2">
                <strong style={{ color: 'var(--neo-text-primary)' }}>
                  {instance.client.firstName} {instance.client.lastName}
                </strong>
              </div>
              {instance.client.email && (
                <div className="mb-1" style={{ color: 'var(--neo-text-secondary)', fontSize: '0.9rem' }}>
                  <i className="bi bi-envelope me-2"></i>
                  {instance.client.email}
                </div>
              )}
              {instance.client.phone && (
                <div className="mb-1" style={{ color: 'var(--neo-text-secondary)', fontSize: '0.9rem' }}>
                  <i className="bi bi-telephone me-2"></i>
                  {instance.client.phone}
                </div>
              )}
              {instance.client.address && (
                <div style={{ color: 'var(--neo-text-secondary)', fontSize: '0.9rem' }}>
                  <i className="bi bi-geo-alt me-2"></i>
                  {instance.client.address}
                  {instance.client.city && `, ${instance.client.city}`}
                </div>
              )}
            </CardBody>
          </Card>
        </div>

        {/* Logs Viewer */}
        <div className="col-lg-8">
          <Card>
            <CardHeader className="d-flex justify-content-between align-items-center">
              <span>
                <i className="bi bi-terminal me-2"></i>
                Logs
              </span>
              <button
                className="btn btn-sm btn-outline-secondary"
                onClick={loadLogs}
                disabled={logsLoading}
              >
                {logsLoading ? (
                  <span className="spinner-border spinner-border-sm" role="status" />
                ) : (
                  <i className="bi bi-arrow-clockwise"></i>
                )}
              </button>
            </CardHeader>
            <CardBody className="p-0">
              <div
                style={{
                  background: 'var(--neo-sidebar-bg, #1a1d21)',
                  color: 'var(--neo-sidebar-text, #adb5bd)',
                  fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
                  fontSize: '0.8rem',
                  lineHeight: '1.6',
                  padding: '16px',
                  maxHeight: '500px',
                  overflowY: 'auto',
                  borderRadius: '0 0 10px 10px',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all',
                }}
              >
                {logsLoading && !logs ? (
                  <div className="text-center py-4">
                    <span className="spinner-border spinner-border-sm me-2" role="status" />
                    Chargement des logs...
                  </div>
                ) : logs ? (
                  <>
                    {logs}
                    <div ref={logsEndRef} />
                  </>
                ) : (
                  <div className="text-center py-4" style={{ opacity: 0.5 }}>
                    Aucun log disponible
                  </div>
                )}
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default CloudInstanceDetailPage;
