import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Spinner } from '../../components';
import { Card, Btn, Icon, Pill } from '../../components/neo';
import type { PillTone } from '../../components/neo';
import { cloudService } from '../../services/cloud.service';
import { useUIStore } from '../../stores';
import type { CloudInstance, CloudInstanceStatus, CloudStats, CreateInstanceInput } from '../../types/cloud.types';

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

function formatRelativeTime(dateStr?: string): string {
  if (!dateStr) return '-';
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'il y a quelques secondes';
  if (diffMin < 60) return `il y a ${diffMin} min`;
  if (diffHour < 24) return `il y a ${diffHour}h`;
  return `il y a ${diffDay}j`;
}

export function CloudInstancesPage() {
  const navigate = useNavigate();
  const { addToast } = useUIStore();
  const [loading, setLoading] = useState(true);
  const [instances, setInstances] = useState<CloudInstance[]>([]);
  const [stats, setStats] = useState<CloudStats>({ total: 0, running: 0, online: 0, errors: 0 });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showProvisionModal, setShowProvisionModal] = useState(false);
  const [provisionForm, setProvisionForm] = useState<CreateInstanceInput>({
    clientId: '',
    domain: '',
    memoryLimitMb: 512,
    cpuLimit: '1.0',
  });
  const [provisioning, setProvisioning] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [instancesRes, statsRes] = await Promise.all([
        cloudService.getInstances({ page, limit: 20, status: statusFilter || undefined, search: search || undefined }),
        cloudService.getStats(),
      ]);
      setInstances(instancesRes.data);
      setTotalPages(instancesRes.meta.totalPages);
      setStats(statsRes);
    } catch (error) {
      console.error('Failed to load cloud instances:', error);
      addToast('error', 'Erreur lors du chargement des instances');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, search, addToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAction = async (id: string, action: 'start' | 'stop' | 'restart' | 'destroy') => {
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

    setActionLoading(id);
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
          break;
      }
      addToast('success', `${labels[action]} de l'instance réussi`);
      await loadData();
    } catch (error) {
      console.error(`Failed to ${action} instance:`, error);
      addToast('error', `Erreur lors du ${labels[action].toLowerCase()} de l'instance`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleProvision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!provisionForm.clientId) {
      addToast('warning', 'Veuillez sélectionner un client');
      return;
    }
    setProvisioning(true);
    try {
      await cloudService.provisionInstance(provisionForm);
      addToast('success', 'Instance créée avec succès');
      setShowProvisionModal(false);
      setProvisionForm({ clientId: '', domain: '', memoryLimitMb: 512, cpuLimit: '1.0' });
      await loadData();
    } catch (error) {
      console.error('Failed to provision instance:', error);
      addToast('error', 'Erreur lors de la création de l\'instance');
    } finally {
      setProvisioning(false);
    }
  };

  if (loading) {
    return <Spinner />;
  }

  return (
    <div className="cloud-instances-page" style={{ padding: 28 }}>
      <div className="page-head">
        <div className="ph-l">
          <h1>Cloud Instances</h1>
          <p>Infrastructure Home Assistant — {instances.length} instance{instances.length > 1 ? 's' : ''}</p>
        </div>
        <div className="page-actions">
          <Btn icon="plus" onClick={() => setShowProvisionModal(true)}>
            Nouvelle instance
          </Btn>
        </div>
      </div>

      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <div className="stat">
          <div className="st-val">{stats.total}</div>
          <div className="st-label">Total</div>
        </div>
        <div className="stat">
          <div className="st-val" style={{ color: 'var(--success)' }}>{stats.running}</div>
          <div className="st-label">En cours</div>
        </div>
        <div className="stat">
          <div className="st-val" style={{ color: 'var(--komun)' }}>{stats.online}</div>
          <div className="st-label">En ligne</div>
        </div>
        <div className="stat">
          <div className="st-val" style={{ color: 'var(--danger)' }}>{stats.errors}</div>
          <div className="st-label">Erreurs</div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 18 }}>
        <div className="fbar">
          <div className="fbar-search">
            <Icon name="search" size={16} />
            <input
              type="search"
              className="neo-field"
              placeholder="Rechercher par client, domaine…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <select
            className="neo-field"
            style={{ maxWidth: 220 }}
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          >
            <option value="">Tous les statuts</option>
            <option value="provisioning">Provisioning</option>
            <option value="running">En cours</option>
            <option value="stopped">Arrêtée</option>
            <option value="error">Erreur</option>
            <option value="destroying">Suppression</option>
          </select>
        </div>
      </div>

      <Card flush>
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Client</th>
                <th>Domaine</th>
                <th>Statut</th>
                <th>En ligne</th>
                <th>Entités</th>
                <th>Dernier heartbeat</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {instances.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div className="empty">
                      <span className="em-ic">
                        <Icon name="cloud" size={22} />
                      </span>
                      <b>Aucune instance trouvée</b>
                      <p>Ajustez vos filtres ou provisionnez une nouvelle instance.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                instances.map((instance) => (
                  <tr
                    key={instance.id}
                    onClick={() => navigate(`/cloud/${instance.id}`)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td>
                      <div className="t-main">{instance.client.firstName} {instance.client.lastName}</div>
                      {instance.client.city && <div className="t-sub">{instance.client.city}</div>}
                    </td>
                    <td>
                      <code className="t-mono">{instance.domain}</code>
                    </td>
                    <td>
                      <Pill tone={STATUS_TONE[instance.status]} dot>
                        {STATUS_LABELS[instance.status]}
                      </Pill>
                    </td>
                    <td>
                      <span
                        style={{
                          display: 'inline-block',
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          background: instance.isOnline ? 'var(--success)' : 'var(--danger)',
                          boxShadow: instance.isOnline ? '0 0 6px var(--success)' : 'none',
                        }}
                        title={instance.isOnline ? 'En ligne' : 'Hors ligne'}
                      />
                    </td>
                    <td className="t-sub">{instance.entityCount}</td>
                    <td className="t-sub">{formatRelativeTime(instance.lastHeartbeat)}</td>
                    <td onClick={(e) => e.stopPropagation()} style={{ whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        {instance.status === 'stopped' && (
                          <Btn
                            variant="success"
                            size="sm"
                            icon="zap"
                            disabled={actionLoading === instance.id}
                            onClick={() => handleAction(instance.id, 'start')}
                          >
                            Démarrer
                          </Btn>
                        )}
                        {instance.status === 'running' && (
                          <>
                            <Btn
                              variant="ghost"
                              size="sm"
                              disabled={actionLoading === instance.id}
                              onClick={() => handleAction(instance.id, 'stop')}
                            >
                              Arrêter
                            </Btn>
                            <Btn
                              variant="ghost"
                              size="sm"
                              icon="activity"
                              disabled={actionLoading === instance.id}
                              onClick={() => handleAction(instance.id, 'restart')}
                            >
                              Redémarrer
                            </Btn>
                          </>
                        )}
                        <Btn
                          variant="danger-ghost"
                          size="sm"
                          icon="trash"
                          disabled={actionLoading === instance.id}
                          onClick={() => handleAction(instance.id, 'destroy')}
                        />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {totalPages > 1 && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '14px 16px',
                borderTop: '1px solid var(--line)',
              }}
            >
              <span style={{ fontSize: 13, color: 'var(--ink-3)' }}>
                Page {page} / {totalPages}
              </span>
              <div style={{ display: 'flex', gap: 8 }}>
                <Btn
                  variant="subtle"
                  size="sm"
                  icon="arrowLeft"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  Précédent
                </Btn>
                <Btn
                  variant="subtle"
                  size="sm"
                  iconRight="arrowRight"
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  Suivant
                </Btn>
              </div>
            </div>
          )}
        </div>
      </Card>

      {showProvisionModal && (
        <>
          <div
            onClick={() => setShowProvisionModal(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.4)',
              zIndex: 1050,
            }}
          />
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 1055,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 20,
              pointerEvents: 'none',
            }}
          >
            <div style={{ width: '100%', maxWidth: 520, pointerEvents: 'auto' }}>
              <Card
                head="Nouvelle instance Cloud"
                icon="cloud"
                action={
                  <Btn variant="subtle" size="sm" icon="x" onClick={() => setShowProvisionModal(false)} />
                }
              >
                <form onSubmit={handleProvision}>
                  <div className="card-body">
                    <div className="field-grid" style={{ marginTop: 0, paddingTop: 0, borderTop: 'none' }}>
                      <div>
                        <div className="field-label">ID Client *</div>
                        <input
                          className="neo-field"
                          placeholder="UUID du client"
                          value={provisionForm.clientId}
                          onChange={(e) => setProvisionForm({ ...provisionForm, clientId: e.target.value })}
                          required
                        />
                      </div>
                      <div>
                        <div className="field-label">Domaine</div>
                        <input
                          className="neo-field"
                          placeholder="ex: client.neo-cloud.fr"
                          value={provisionForm.domain || ''}
                          onChange={(e) => setProvisionForm({ ...provisionForm, domain: e.target.value })}
                        />
                        <div style={{ color: 'var(--ink-3)', fontSize: 12, marginTop: 4 }}>
                          Laisser vide pour générer automatiquement
                        </div>
                      </div>
                    </div>
                    <div className="field-grid">
                      <div>
                        <div className="field-label">Mémoire (Mo)</div>
                        <select
                          className="neo-field"
                          value={provisionForm.memoryLimitMb}
                          onChange={(e) => setProvisionForm({ ...provisionForm, memoryLimitMb: Number(e.target.value) })}
                        >
                          <option value={256}>256 Mo</option>
                          <option value={512}>512 Mo</option>
                          <option value={1024}>1 Go</option>
                          <option value={2048}>2 Go</option>
                        </select>
                      </div>
                      <div>
                        <div className="field-label">CPU Limit</div>
                        <select
                          className="neo-field"
                          value={provisionForm.cpuLimit}
                          onChange={(e) => setProvisionForm({ ...provisionForm, cpuLimit: e.target.value })}
                        >
                          <option value="0.5">0.5 CPU</option>
                          <option value="1.0">1.0 CPU</option>
                          <option value="2.0">2.0 CPU</option>
                        </select>
                      </div>
                    </div>
                    <div style={{ marginTop: 14 }}>
                      <div className="field-label">Version HA</div>
                      <input
                        className="neo-field"
                        placeholder="ex: 2024.1.0 (défaut: latest)"
                        value={provisionForm.haVersion || ''}
                        onChange={(e) => setProvisionForm({ ...provisionForm, haVersion: e.target.value })}
                      />
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
                      <Btn type="submit" icon="cloud" disabled={provisioning}>
                        {provisioning ? 'Provisionnement…' : 'Provisionner'}
                      </Btn>
                      <Btn type="button" variant="subtle" onClick={() => setShowProvisionModal(false)}>
                        Annuler
                      </Btn>
                    </div>
                  </div>
                </form>
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default CloudInstancesPage;
