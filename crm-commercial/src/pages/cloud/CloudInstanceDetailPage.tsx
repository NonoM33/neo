import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Spinner } from '../../components';
import { Card, Btn, Icon, Pill } from '../../components/neo';
import type { PillTone } from '../../components/neo';
import { cloudService } from '../../services/cloud.service';
import { useUIStore } from '../../stores';
import type { CloudInstance, CloudInstanceStatus } from '../../types/cloud.types';

const STATUS_TONE: Record<CloudInstanceStatus, PillTone> = {
  provisioning: 'info',
  running: 'success',
  stopped: 'neutral',
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
      <div style={{ padding: 28 }}>
        <div className="empty">
          <span className="em-ic">
            <Icon name="cloud" size={22} />
          </span>
          <b>Instance introuvable</b>
          <p>Cette instance n'existe pas ou a été supprimée.</p>
          <div style={{ marginTop: 14 }}>
            <Btn icon="arrowLeft" onClick={() => navigate('/cloud')}>
              Retour aux instances
            </Btn>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="cloud-instance-detail-page" style={{ padding: 28 }}>
      <div className="page-head">
        <div className="ph-l">
          <button className="back-link" onClick={() => navigate('/cloud')}>
            <Icon name="arrowLeft" size={15} /> Retour aux instances
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <h1>{instance.client.firstName} {instance.client.lastName}</h1>
            <Pill tone={STATUS_TONE[instance.status]} dot>
              {STATUS_LABELS[instance.status]}
            </Pill>
            <span
              style={{
                display: 'inline-block',
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                background: instance.isOnline ? 'var(--success)' : 'var(--danger)',
                boxShadow: instance.isOnline ? '0 0 8px var(--success)' : 'none',
              }}
              title={instance.isOnline ? 'En ligne' : 'Hors ligne'}
            />
          </div>
          <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 10 }}>
            <code className="t-mono" style={{ color: 'var(--ink-2)' }}>{instance.domain}</code>
            {instance.port && (
              <span style={{ color: 'var(--ink-3)', fontSize: 13 }}>Port: {instance.port}</span>
            )}
          </div>
        </div>
        <div className="page-actions">
          {instance.status === 'stopped' && (
            <Btn
              variant="success"
              icon="zap"
              disabled={!!actionLoading}
              onClick={() => handleAction('start')}
            >
              {actionLoading === 'start' ? 'Démarrage…' : 'Démarrer'}
            </Btn>
          )}
          {instance.status === 'running' && (
            <>
              <Btn
                variant="ochre"
                disabled={!!actionLoading}
                onClick={() => handleAction('stop')}
              >
                {actionLoading === 'stop' ? 'Arrêt…' : 'Arrêter'}
              </Btn>
              <Btn
                variant="ghost"
                icon="activity"
                disabled={!!actionLoading}
                onClick={() => handleAction('restart')}
              >
                {actionLoading === 'restart' ? 'Redémarrage…' : 'Redémarrer'}
              </Btn>
            </>
          )}
          <Btn
            variant="danger-ghost"
            icon="trash"
            disabled={!!actionLoading}
            onClick={() => handleAction('destroy')}
          >
            {actionLoading === 'destroy' ? 'Suppression…' : 'Supprimer'}
          </Btn>
          {instance.domain && (
            <a
              href={`https://${instance.domain}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn ghost"
            >
              <Icon name="arrowRight" size={17} />
              Ouvrir HA
            </a>
          )}
        </div>
      </div>

      {instance.errorMessage && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '12px 16px',
            marginBottom: 18,
            borderRadius: 'var(--r-md)',
            background: 'var(--danger-soft)',
            color: 'var(--danger-ink)',
            border: '1px solid var(--danger)',
          }}
        >
          <Icon name="shield" size={18} />
          <span>{instance.errorMessage}</span>
        </div>
      )}

      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <div className="stat">
          <div className="st-val">{instance.entityCount}</div>
          <div className="st-label">Entités</div>
        </div>
        <div className="stat">
          <div className="st-val">{instance.automationCount}</div>
          <div className="st-label">Automations</div>
        </div>
        <div className="stat">
          <div className="st-val">{computeUptime(instance.provisionedAt, instance.status)}</div>
          <div className="st-label">Uptime</div>
        </div>
        <div className="stat">
          <div className="st-val">{instance.memoryLimitMb} Mo</div>
          <div className="st-label">Mémoire</div>
        </div>
      </div>

      <div className="lead-grid">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <Card head="Logs" icon="activity" flush
            action={
              <Btn
                variant="subtle"
                size="sm"
                icon="activity"
                disabled={logsLoading}
                onClick={loadLogs}
              >
                {logsLoading ? 'Chargement…' : 'Rafraîchir'}
              </Btn>
            }
          >
            <div
              style={{
                background: 'var(--ink)',
                color: 'var(--paper)',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.8rem',
                lineHeight: '1.6',
                padding: '16px',
                margin: '0 16px 16px',
                maxHeight: '500px',
                overflowY: 'auto',
                borderRadius: 'var(--r-md)',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
              }}
            >
              {logsLoading && !logs ? (
                <div style={{ textAlign: 'center', padding: '24px 0' }}>
                  Chargement des logs…
                </div>
              ) : logs ? (
                <>
                  {logs}
                  <div ref={logsEndRef} />
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: '24px 0', opacity: 0.5 }}>
                  Aucun log disponible
                </div>
              )}
            </div>
          </Card>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <Card head="Informations" icon="settings">
            <div className="card-body">
              <dl className="detail-dl">
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <dt>Container</dt>
                  <dd className="t-mono">{instance.containerName || '-'}</dd>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <dt>Version HA</dt>
                  <dd>{instance.haVersion || 'latest'}</dd>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <dt>CPU</dt>
                  <dd>{instance.cpuLimit} core(s)</dd>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <dt>Mémoire</dt>
                  <dd>{instance.memoryLimitMb} Mo</dd>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <dt>Port</dt>
                  <dd>{instance.port || '-'}</dd>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <dt>Créée le</dt>
                  <dd>{formatDateTime(instance.createdAt)}</dd>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <dt>Provisionnée</dt>
                  <dd>{formatDateTime(instance.provisionedAt)}</dd>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <dt>Dernier heartbeat</dt>
                  <dd>{formatDateTime(instance.lastHeartbeat)}</dd>
                </div>
              </dl>
            </div>
          </Card>

          <Card head="Client" icon="user">
            <div className="card-body">
              <div style={{ fontWeight: 600, color: 'var(--ink)', marginBottom: 8 }}>
                {instance.client.firstName} {instance.client.lastName}
              </div>
              {instance.client.email && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--ink-3)', fontSize: 13, marginBottom: 4 }}>
                  <Icon name="mail" size={15} />
                  {instance.client.email}
                </div>
              )}
              {instance.client.phone && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--ink-3)', fontSize: 13, marginBottom: 4 }}>
                  <Icon name="phone" size={15} />
                  {instance.client.phone}
                </div>
              )}
              {instance.client.address && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--ink-3)', fontSize: 13 }}>
                  <Icon name="building" size={15} />
                  {instance.client.address}
                  {instance.client.city && `, ${instance.client.city}`}
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default CloudInstanceDetailPage;
