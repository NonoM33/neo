import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Spinner } from '../../components';
import { Btn, Icon, Pill } from '../../components/neo';
import type { PillTone } from '../../components/neo';
import { ticketsService } from '../../services';
import {
  ticketPriorityLabels,
  ticketStatusLabels,
  type TicketListItem,
  type TicketPriority,
  type TicketStats,
  type TicketStatus,
} from '../../types';
import { assigneeLabel } from './ticket-display';

const PAGE_SIZE = 20;

const STATUS_TONE: Record<TicketStatus, PillTone> = {
  nouveau: 'info',
  ouvert: 'ochre',
  en_attente_client: 'warning',
  en_attente_interne: 'neutral',
  escalade: 'danger',
  resolu: 'success',
  ferme: 'dark',
};

const PRIORITY_TONE: Record<TicketPriority, PillTone> = {
  basse: 'neutral',
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
    <div className="tickets-page">
      <div className="page-head">
        <div className="ph-l">
          <h1>Tickets</h1>
          <p>
            {total} ticket{total > 1 ? 's' : ''} — support client
          </p>
        </div>
        <div className="page-actions">
          <Btn icon="plus" onClick={() => navigate('/tickets/new')}>
            Nouveau ticket
          </Btn>
        </div>
      </div>

      {stats && (
        <div className="stat-grid mb-22" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
          <div className="stat">
            <div className="st-val">{stats.totalOpen}</div>
            <div className="st-label">Tickets ouverts</div>
          </div>
          <div className="stat">
            <div className="st-val" style={{ color: 'var(--danger)' }}>
              {stats.slaBreached}
            </div>
            <div className="st-label">SLA dépassés</div>
          </div>
          <div className="stat">
            <div className="st-val">
              {stats.avgResolutionHours != null ? `${stats.avgResolutionHours} h` : '—'}
            </div>
            <div className="st-label">Résolution moyenne</div>
          </div>
          <div className="stat">
            <div className="st-val">{total}</div>
            <div className="st-label">Total</div>
          </div>
        </div>
      )}

      <div className="card" style={{ marginBottom: 18 }}>
        <div className="fbar">
          <div className="fbar-search">
            <Icon name="search" size={16} />
            <input
              type="search"
              className="neo-field"
              placeholder="Rechercher par titre ou description…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="neo-field"
            style={{ maxWidth: 200 }}
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
          <select
            className="neo-field"
            style={{ maxWidth: 200 }}
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

      {loading ? (
        <Spinner />
      ) : (
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Numéro</th>
                <th>Titre</th>
                <th>Client</th>
                <th>Priorité</th>
                <th>Statut</th>
                <th>Assigné à</th>
                <th>Créé le</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((t) => (
                <tr
                  key={t.id}
                  onClick={() => navigate(`/tickets/${t.id}`)}
                  style={{ cursor: 'pointer' }}
                >
                  <td className="t-mono">{t.number}</td>
                  <td>
                    <div className="t-main">{t.title}</div>
                    {t.slaBreached && (
                      <Pill tone="danger" dot>
                        SLA dépassé
                      </Pill>
                    )}
                  </td>
                  <td className="t-sub">
                    {t.client.firstName} {t.client.lastName}
                  </td>
                  <td>
                    <Pill tone={PRIORITY_TONE[t.priority]} dot>
                      {ticketPriorityLabels[t.priority]}
                    </Pill>
                  </td>
                  <td>
                    <Pill tone={STATUS_TONE[t.status]} dot>
                      {ticketStatusLabels[t.status]}
                    </Pill>
                  </td>
                  <td className="t-sub">{assigneeLabel(t.assignedTo)}</td>
                  <td className="t-sub">{formatDate(t.createdAt)}</td>
                </tr>
              ))}
              {tickets.length === 0 && (
                <tr>
                  <td colSpan={7}>
                    <div className="empty">
                      <span className="em-ic">
                        <Icon name="ticket" size={22} />
                      </span>
                      <b>Aucun ticket</b>
                      <p>Ajustez vos filtres ou créez un nouveau ticket.</p>
                    </div>
                  </td>
                </tr>
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
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Précédent
                </Btn>
                <Btn
                  variant="subtle"
                  size="sm"
                  iconRight="arrowRight"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Suivant
                </Btn>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default TicketsPage;
