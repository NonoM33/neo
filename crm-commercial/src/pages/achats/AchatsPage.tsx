import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Spinner } from '../../components';
import { Btn, Icon, Pill } from '../../components/neo';
import type { PillTone } from '../../components/neo';
import { supplierOrdersService } from '../../services';
import {
  supplierOrderStatusLabels,
  type SupplierOrderListItem,
  type SupplierOrderStatus,
} from '../../types';

const PAGE_SIZE = 20;

const STATUS_TONE: Record<SupplierOrderStatus, PillTone> = {
  brouillon: 'neutral',
  envoyee: 'info',
  confirmee: 'warning',
  recue: 'success',
  annulee: 'danger',
};

const currency = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });

function formatDate(value: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('fr-FR');
}

export function AchatsPage() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<SupplierOrderListItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState<'' | SupplierOrderStatus>('');

  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      const response = await supplierOrdersService.getSupplierOrders(
        { status: status || undefined },
        page,
        PAGE_SIZE
      );
      setOrders(response.data);
      setTotalPages(response.meta.totalPages);
      setTotal(response.meta.total);
    } catch (error) {
      console.error('Failed to load supplier orders:', error);
      toast.error('Impossible de charger les commandes fournisseurs');
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
    <div className="achats-page">
      <div className="page-head">
        <div className="ph-l">
          <h1>Achats fournisseurs</h1>
          <p>{total} commandes fournisseurs</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 18 }}>
        <div className="fbar">
          <select
            className="neo-field"
            style={{ maxWidth: 220 }}
            value={status}
            onChange={(e) => setStatus(e.target.value as '' | SupplierOrderStatus)}
          >
            <option value="">Tous les statuts</option>
            {(Object.keys(supplierOrderStatusLabels) as SupplierOrderStatus[]).map((s) => (
              <option key={s} value={s}>
                {supplierOrderStatusLabels[s]}
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
                <th>Fournisseur</th>
                <th style={{ textAlign: 'right' }}>Total TTC</th>
                <th>Livraison prévue</th>
                <th>Statut</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr
                  key={o.id}
                  onClick={() => navigate(`/achats/${o.id}`)}
                  style={{ cursor: 'pointer' }}
                >
                  <td className="t-mono">{o.number}</td>
                  <td className="t-main">{o.supplier.name}</td>
                  <td className="t-mono" style={{ textAlign: 'right' }}>
                    {currency.format(Number(o.totalTTC))}
                  </td>
                  <td className="t-sub">{formatDate(o.expectedDeliveryDate)}</td>
                  <td>
                    <Pill tone={STATUS_TONE[o.status]} dot>
                      {supplierOrderStatusLabels[o.status]}
                    </Pill>
                  </td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                      <button
                        className="icon-btn"
                        aria-label="Détail"
                        onClick={() => navigate(`/achats/${o.id}`)}
                      >
                        <Icon name="chevronRight" size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr>
                  <td colSpan={6}>
                    <div className="empty">
                      <span className="em-ic">
                        <Icon name="truck" size={22} />
                      </span>
                      <b>Aucune commande fournisseur</b>
                      <p>Les achats apparaissent ici une fois créés.</p>
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

export default AchatsPage;
