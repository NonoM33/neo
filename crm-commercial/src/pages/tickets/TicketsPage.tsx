import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Card, CardBody, Table, Button } from '../../components';
import { ticketsService } from '../../services';
import {
  ticketPriorityLabels,
  ticketStatusLabels,
  type TicketListItem,
  type TicketPriority,
  type TicketStats,
  type TicketStatus,
} from '../../types';

const PAGE_SIZE = 20;

const STATUS_VARIANT: Record<TicketStatus, string> = {
  nouveau: 'info',
  ouvert: 'primary',
  en_attente_client: 'warning',
  en_attente_interne: 'secondary',
  escalade: 'danger',
  resolu: 'success',
  ferme: 'dark',
};

const PRIORITY_VARIANT: Record<TicketPriority, string> = {
  basse: 'secondary',
  normale: 'info',
  haute: 'warning',
  urgente: 'danger',
  critique: 'danger',
};

function formatDate(value: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('fr-FR');
}

export function TicketsPage() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState<TicketListItem[]>([]);
  const [stats, setStats] = useState<TicketStats | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'' | TicketStatus>('');
  const [priority, setPriority] = useState<'' | TicketPriority>('');

  const loadTickets = useCallback(async () => {
    setLoading(true);
    try {
      const response = await ticketsService.getTickets(
        {
          search: search.trim() || undefined,
          status: status || undefined,
          priority: priority || undefined,
        },
        page,
        PAGE_SIZE
      );
      setTickets(response.data);
      setTotalPages(response.meta.totalPages);
      setTotal(response.meta.total);
    } catch (error) {
      console.error('Failed to load tickets:', error);
      toast.error('Impossible de charger les tickets');
    } finally {
      setLoading(false);
    }
  }, [search, status, priority, page]);

  useEffect(() => {
    ticketsService
      .getStats()
      .then(setStats)
      .catch((error) => console.error('Failed to load ticket stats:', error));
  }, []);

  useEffect(() => {
    const handle = setTimeout(() => setPage(1), 300);
    return () => clearTimeout(handle);
  }, [search, status, priority]);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  return (
    <div className="content-area">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="page-title">Tickets</h1>
          <p className="text-secondary mb-0">{total} tickets</p>
        </div>
        <Button icon="bi-plus-lg" onClick={() => navigate('/tickets/new')}>
          Nouveau ticket
        </Button>
      </div>

      {stats && (
        <div className="row g-3 mb-4">
          <div className="col-sm-6 col-lg-3">
            <Card>
              <CardBody>
                <div className="text-secondary small">Tickets ouverts</div>
                <div className="h3 mb-0">{stats.totalOpen}</div>
              </CardBody>
            </Card>
          </div>
          <div className="col-sm-6 col-lg-3">
            <Card>
              <CardBody>
                <div className="text-secondary small">SLA dépassés</div>
                <div className="h3 mb-0 text-danger">{stats.slaBreached}</div>
              </CardBody>
            </Card>
          </div>
          <div className="col-sm-6 col-lg-3">
            <Card>
              <CardBody>
                <div className="text-secondary small">Résolution moyenne</div>
                <div className="h3 mb-0">
                  {stats.avgResolutionHours != null ? `${stats.avgResolutionHours} h` : '—'}
                </div>
              </CardBody>
            </Card>
          </div>
          <div className="col-sm-6 col-lg-3">
            <Card>
              <CardBody>
                <div className="text-secondary small">Total</div>
                <div className="h3 mb-0">{total}</div>
              </CardBody>
            </Card>
          </div>
        </div>
      )}

      <Card className="mb-4">
        <CardBody>
          <div className="row g-3">
            <div className="col-md-6">
              <div className="input-group">
                <span className="input-group-text bg-transparent">
                  <i className="bi bi-search"></i>
                </span>
                <input
                  type="search"
                  className="form-control"
                  placeholder="Rechercher par titre ou description…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
            <div className="col-md-3">
              <select
                className="form-select"
                value={status}
                onChange={(e) => setStatus(e.target.value as '' | TicketStatus)}
              >
                <option value="">Tous les statuts</option>
                {(Object.keys(ticketStatusLabels) as TicketStatus[]).map((s) => (
                  <option key={s} value={s}>
                    {ticketStatusLabels[s]}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-3">
              <select
                className="form-select"
                value={priority}
                onChange={(e) => setPriority(e.target.value as '' | TicketPriority)}
              >
                <option value="">Toutes les priorités</option>
                {(Object.keys(ticketPriorityLabels) as TicketPriority[]).map((p) => (
                  <option key={p} value={p}>
                    {ticketPriorityLabels[p]}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <Table<TicketListItem>
            loading={loading}
            data={tickets}
            keyExtractor={(t) => t.id}
            emptyMessage="Aucun ticket"
            onRowClick={(t) => navigate(`/tickets/${t.id}`)}
            columns={[
              {
                key: 'number',
                header: 'Numéro',
                render: (t) => <span className="fw-semibold">{t.number}</span>,
              },
              {
                key: 'title',
                header: 'Titre',
                render: (t) => (
                  <div>
                    <div>{t.title}</div>
                    {t.slaBreached && (
                      <span className="badge bg-danger mt-1">SLA dépassé</span>
                    )}
                  </div>
                ),
              },
              {
                key: 'client',
                header: 'Client',
                render: (t) => `${t.client.firstName} ${t.client.lastName}`,
              },
              {
                key: 'priority',
                header: 'Priorité',
                render: (t) => (
                  <span className={`badge bg-${PRIORITY_VARIANT[t.priority]}`}>
                    {ticketPriorityLabels[t.priority]}
                  </span>
                ),
              },
              {
                key: 'status',
                header: 'Statut',
                render: (t) => (
                  <span className={`badge bg-${STATUS_VARIANT[t.status]}`}>
                    {ticketStatusLabels[t.status]}
                  </span>
                ),
              },
              {
                key: 'assignedTo',
                header: 'Assigné à',
                render: (t) =>
                  t.assignedTo.id
                    ? `${t.assignedTo.firstName ?? ''} ${t.assignedTo.lastName ?? ''}`.trim()
                    : '—',
              },
              { key: 'createdAt', header: 'Créé le', render: (t) => formatDate(t.createdAt) },
            ]}
          />

          {totalPages > 1 && (
            <div className="d-flex justify-content-between align-items-center mt-3">
              <span className="text-secondary small">
                Page {page} / {totalPages}
              </span>
              <div className="btn-group">
                <Button
                  variant="outline-secondary"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Précédent
                </Button>
                <Button
                  variant="outline-secondary"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Suivant
                </Button>
              </div>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

export default TicketsPage;
