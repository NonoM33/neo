import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Spinner } from '../../components';
import { Btn, Icon, Pill } from '../../components/neo';
import type { PillTone } from '../../components/neo';
import { ordersService } from '../../services';
import { orderStatusLabels, type OrderListItem, type OrderStatus } from '../../types';

const PAGE_SIZE = 20;

const STATUS_TONE: Record<OrderStatus, PillTone> = {
  en_attente: 'neutral',
  confirmee: 'info',
  payee: 'success',
  en_preparation: 'warning',
  expediee: 'info',
  livree: 'success',
  annulee: 'danger',
};

const currency = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });

function formatDate(value: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('fr-FR');
}

export function CommandesPage() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState<'' | OrderStatus>('');

  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      const response = await ordersService.getOrders(
        { status: status || undefined },
        page,
        PAGE_SIZE
      );
      setOrders(response.data);
      setTotalPages(response.meta.totalPages);
      setTotal(response.meta.total);
    } catch (error) {
      console.error('Failed to load orders:', error);
      toast.error('Impossible de charger les commandes');
    } finally {
      setLoading(false);
    }
  }, [status, page]);

  useEffect(() => {
    setPage(1);
  }, [status]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  return (
    <div className="commandes-page">
      <div className="page-head">
        <div className="ph-l">
          <h1>Commandes</h1>
          <p>{total} commandes enregistrées</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 18 }}>
        <div className="fbar">
          <select
            className="neo-field"
            style={{ maxWidth: 220 }}
            value={status}
            onChange={(e) => setStatus(e.target.value as '' | OrderStatus)}
          >
            <option value="">Tous les statuts</option>
            {(Object.keys(orderStatusLabels) as OrderStatus[]).map((s) => (
              <option key={s} value={s}>
                {orderStatusLabels[s]}
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
                <th>Client</th>
                <th>Projet</th>
                <th style={{ textAlign: 'right' }}>Total TTC</th>
                <th>Statut</th>
                <th>Créée le</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr
                  key={o.id}
                  onClick={() => navigate(`/commandes/${o.id}`)}
                  style={{ cursor: 'pointer' }}
                >
                  <td className="t-mono">{o.number}</td>
                  <td className="t-sub">
                    {o.client.firstName} {o.client.lastName}
                  </td>
                  <td className="t-main">{o.project.name}</td>
                  <td className="t-mono" style={{ textAlign: 'right' }}>
                    {currency.format(Number(o.totalTTC))}
                  </td>
                  <td>
                    <Pill tone={STATUS_TONE[o.status]} dot>
                      {orderStatusLabels[o.status]}
                    </Pill>
                  </td>
                  <td className="t-sub">{formatDate(o.createdAt)}</td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                      <button
                        className="icon-btn"
                        aria-label="Détail"
                        onClick={() => navigate(`/commandes/${o.id}`)}
                      >
                        <Icon name="chevronRight" size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr>
                  <td colSpan={7}>
                    <div className="empty">
                      <span className="em-ic">
                        <Icon name="cart" size={22} />
                      </span>
                      <b>Aucune commande</b>
                      <p>Les commandes apparaissent après conversion d'un devis accepté.</p>
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

export default CommandesPage;
