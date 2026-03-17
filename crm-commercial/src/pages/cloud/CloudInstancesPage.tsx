import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardBody, Spinner, StatCard } from '../../components';
import { cloudService } from '../../services/cloud.service';
import { useUIStore } from '../../stores';
import type { CloudInstance, CloudInstanceStatus, CloudStats, CreateInstanceInput } from '../../types/cloud.types';

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
    <div className="cloud-instances-page">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="page-title mb-0">
          <i className="bi bi-cloud-arrow-up me-2"></i>
          Cloud Instances
        </h1>
        <button className="btn btn-primary" onClick={() => setShowProvisionModal(true)}>
          <i className="bi bi-plus-lg me-2"></i>
          Nouvelle instance
        </button>
      </div>

      {/* Stats Cards */}
      <div className="row g-3 mb-4">
        <div className="col-6 col-lg-3">
          <StatCard label="Total" value={stats.total} icon="bi-cloud" color="primary" />
        </div>
        <div className="col-6 col-lg-3">
          <StatCard label="En cours" value={stats.running} icon="bi-play-circle" color="success" />
        </div>
        <div className="col-6 col-lg-3">
          <StatCard label="En ligne" value={stats.online} icon="bi-wifi" color="info" />
        </div>
        <div className="col-6 col-lg-3">
          <StatCard label="Erreurs" value={stats.errors} icon="bi-exclamation-triangle" color="danger" />
        </div>
      </div>

      {/* Filter Bar */}
      <Card className="mb-4">
        <CardBody>
          <div className="row g-3 align-items-center">
            <div className="col-md-6">
              <div className="input-group">
                <span className="input-group-text" style={{ background: 'var(--neo-bg-card)', borderColor: 'var(--neo-border-color)', color: 'var(--neo-text-secondary)' }}>
                  <i className="bi bi-search"></i>
                </span>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Rechercher par client, domaine..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                />
              </div>
            </div>
            <div className="col-md-3">
              <select
                className="form-select"
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
            <div className="col-md-3 text-end">
              <span style={{ color: 'var(--neo-text-secondary)', fontSize: '0.875rem' }}>
                {instances.length} instance{instances.length > 1 ? 's' : ''}
              </span>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Instances Table */}
      <Card>
        <CardBody className="p-0">
          <div className="table-responsive">
            <table className="table table-hover mb-0">
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
                    <td colSpan={7} className="text-center py-5" style={{ color: 'var(--neo-text-secondary)' }}>
                      <i className="bi bi-cloud-slash fs-1 d-block mb-2"></i>
                      Aucune instance trouvée
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
                        <strong>{instance.client.firstName} {instance.client.lastName}</strong>
                        {instance.client.city && (
                          <div style={{ fontSize: '0.8rem', color: 'var(--neo-text-secondary)' }}>
                            {instance.client.city}
                          </div>
                        )}
                      </td>
                      <td>
                        <code style={{ color: 'var(--neo-text-primary)', background: 'var(--neo-bg-light, rgba(0,0,0,0.05))', padding: '2px 6px', borderRadius: '4px', fontSize: '0.85rem' }}>
                          {instance.domain}
                        </code>
                      </td>
                      <td>
                        <span className={`badge bg-${STATUS_BADGE_MAP[instance.status]}`}>
                          {STATUS_LABELS[instance.status]}
                        </span>
                      </td>
                      <td>
                        <span
                          style={{
                            display: 'inline-block',
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background: instance.isOnline ? 'var(--neo-success)' : 'var(--neo-danger)',
                            boxShadow: instance.isOnline ? '0 0 6px var(--neo-success)' : 'none',
                          }}
                          title={instance.isOnline ? 'En ligne' : 'Hors ligne'}
                        />
                      </td>
                      <td style={{ color: 'var(--neo-text-secondary)' }}>{instance.entityCount}</td>
                      <td style={{ color: 'var(--neo-text-secondary)', fontSize: '0.85rem' }}>
                        {formatRelativeTime(instance.lastHeartbeat)}
                      </td>
                      <td>
                        <div className="dropdown" onClick={(e) => e.stopPropagation()}>
                          <button
                            className="btn btn-sm btn-outline-secondary"
                            data-bs-toggle="dropdown"
                            disabled={actionLoading === instance.id}
                          >
                            {actionLoading === instance.id ? (
                              <span className="spinner-border spinner-border-sm" role="status" />
                            ) : (
                              <i className="bi bi-three-dots-vertical"></i>
                            )}
                          </button>
                          <ul className="dropdown-menu dropdown-menu-end">
                            <li>
                              <button className="dropdown-item" onClick={() => navigate(`/cloud/${instance.id}`)}>
                                <i className="bi bi-eye me-2"></i>Voir détails
                              </button>
                            </li>
                            <li><hr className="dropdown-divider" /></li>
                            {instance.status === 'stopped' && (
                              <li>
                                <button className="dropdown-item" onClick={() => handleAction(instance.id, 'start')}>
                                  <i className="bi bi-play-fill me-2 text-success"></i>Démarrer
                                </button>
                              </li>
                            )}
                            {instance.status === 'running' && (
                              <>
                                <li>
                                  <button className="dropdown-item" onClick={() => handleAction(instance.id, 'stop')}>
                                    <i className="bi bi-stop-fill me-2 text-warning"></i>Arrêter
                                  </button>
                                </li>
                                <li>
                                  <button className="dropdown-item" onClick={() => handleAction(instance.id, 'restart')}>
                                    <i className="bi bi-arrow-clockwise me-2 text-info"></i>Redémarrer
                                  </button>
                                </li>
                              </>
                            )}
                            <li><hr className="dropdown-divider" /></li>
                            <li>
                              <button className="dropdown-item text-danger" onClick={() => handleAction(instance.id, 'destroy')}>
                                <i className="bi bi-trash me-2"></i>Supprimer
                              </button>
                            </li>
                          </ul>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="d-flex justify-content-center mt-4">
          <nav>
            <ul className="pagination">
              <li className={`page-item ${page <= 1 ? 'disabled' : ''}`}>
                <button className="page-link" onClick={() => setPage(page - 1)}>
                  <i className="bi bi-chevron-left"></i>
                </button>
              </li>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <li key={p} className={`page-item ${p === page ? 'active' : ''}`}>
                  <button className="page-link" onClick={() => setPage(p)}>{p}</button>
                </li>
              ))}
              <li className={`page-item ${page >= totalPages ? 'disabled' : ''}`}>
                <button className="page-link" onClick={() => setPage(page + 1)}>
                  <i className="bi bi-chevron-right"></i>
                </button>
              </li>
            </ul>
          </nav>
        </div>
      )}

      {/* Provision Modal */}
      {showProvisionModal && (
        <>
          <div className="modal-backdrop fade show" onClick={() => setShowProvisionModal(false)} />
          <div className="modal fade show d-block" tabIndex={-1}>
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content" style={{ background: 'var(--neo-bg-card)', color: 'var(--neo-text-primary)' }}>
                <div className="modal-header" style={{ borderColor: 'var(--neo-border-color)' }}>
                  <h5 className="modal-title">
                    <i className="bi bi-cloud-plus me-2"></i>
                    Nouvelle instance Cloud
                  </h5>
                  <button type="button" className="btn-close" onClick={() => setShowProvisionModal(false)} />
                </div>
                <form onSubmit={handleProvision}>
                  <div className="modal-body">
                    <div className="mb-3">
                      <label className="form-label">ID Client *</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="UUID du client"
                        value={provisionForm.clientId}
                        onChange={(e) => setProvisionForm({ ...provisionForm, clientId: e.target.value })}
                        required
                      />
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Domaine</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="ex: client.neo-cloud.fr"
                        value={provisionForm.domain || ''}
                        onChange={(e) => setProvisionForm({ ...provisionForm, domain: e.target.value })}
                      />
                      <div className="form-text" style={{ color: 'var(--neo-text-secondary)' }}>
                        Laisser vide pour générer automatiquement
                      </div>
                    </div>
                    <div className="row g-3">
                      <div className="col-6">
                        <label className="form-label">Mémoire (Mo)</label>
                        <select
                          className="form-select"
                          value={provisionForm.memoryLimitMb}
                          onChange={(e) => setProvisionForm({ ...provisionForm, memoryLimitMb: Number(e.target.value) })}
                        >
                          <option value={256}>256 Mo</option>
                          <option value={512}>512 Mo</option>
                          <option value={1024}>1 Go</option>
                          <option value={2048}>2 Go</option>
                        </select>
                      </div>
                      <div className="col-6">
                        <label className="form-label">CPU Limit</label>
                        <select
                          className="form-select"
                          value={provisionForm.cpuLimit}
                          onChange={(e) => setProvisionForm({ ...provisionForm, cpuLimit: e.target.value })}
                        >
                          <option value="0.5">0.5 CPU</option>
                          <option value="1.0">1.0 CPU</option>
                          <option value="2.0">2.0 CPU</option>
                        </select>
                      </div>
                    </div>
                    <div className="mt-3">
                      <label className="form-label">Version HA</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="ex: 2024.1.0 (défaut: latest)"
                        value={provisionForm.haVersion || ''}
                        onChange={(e) => setProvisionForm({ ...provisionForm, haVersion: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="modal-footer" style={{ borderColor: 'var(--neo-border-color)' }}>
                    <button type="button" className="btn btn-outline-secondary" onClick={() => setShowProvisionModal(false)}>
                      Annuler
                    </button>
                    <button type="submit" className="btn btn-primary" disabled={provisioning}>
                      {provisioning && <span className="spinner-border spinner-border-sm me-2" role="status" />}
                      <i className="bi bi-cloud-plus me-1"></i>
                      Provisionner
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default CloudInstancesPage;
