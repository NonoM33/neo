import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Spinner } from '../../components';
import { Card, Btn, Icon, Pill } from '../../components/neo';
import type { PillTone } from '../../components/neo';
import { stockService } from '../../services';
import {
  stockMovementTypeLabels,
  type StockAlert,
  type StockDashboard,
  type StockMovement,
  type StockMovementType,
} from '../../types';
import { StockMovementModal } from './StockMovementModal';

const PAGE_SIZE = 20;

const TYPE_TONE: Record<StockMovementType, PillTone> = {
  entree: 'success',
  sortie: 'danger',
  reservation: 'warning',
  liberation: 'info',
  correction: 'neutral',
  retour: 'info',
};

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString('fr-FR');
}

function StatTile({
  icon,
  tone,
  value,
  label,
}: {
  icon: 'boxes' | 'bell' | 'bug';
  tone: PillTone;
  value: number;
  label: string;
}) {
  return (
    <div
      className="card"
      style={{ padding: 18, display: 'flex', alignItems: 'center', gap: 14 }}
    >
      <Pill tone={tone}>
        <Icon name={icon} size={18} />
      </Pill>
      <div>
        <div style={{ fontSize: 26, fontWeight: 700, lineHeight: 1.1 }}>{value}</div>
        <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>{label}</div>
      </div>
    </div>
  );
}

export function StockPage() {
  const [dashboard, setDashboard] = useState<StockDashboard | null>(null);
  const [alerts, setAlerts] = useState<StockAlert[]>([]);
  const [loading, setLoading] = useState(true);

  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [movLoading, setMovLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [typeFilter, setTypeFilter] = useState<'' | StockMovementType>('');

  const [modalOpen, setModalOpen] = useState(false);

  const loadOverview = useCallback(async () => {
    setLoading(true);
    try {
      const [dash, alertList] = await Promise.all([
        stockService.getDashboard(),
        stockService.getAlerts(),
      ]);
      setDashboard(dash);
      setAlerts(alertList);
    } catch (error) {
      console.error('Failed to load stock overview:', error);
      toast.error('Impossible de charger le tableau de bord stock');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMovements = useCallback(async () => {
    setMovLoading(true);
    try {
      const response = await stockService.getMovements(
        { type: typeFilter || undefined },
        page,
        PAGE_SIZE
      );
      setMovements(response.data);
      setTotalPages(response.meta.totalPages);
    } catch (error) {
      console.error('Failed to load stock movements:', error);
      toast.error('Impossible de charger les mouvements');
    } finally {
      setMovLoading(false);
    }
  }, [typeFilter, page]);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  useEffect(() => {
    setPage(1);
  }, [typeFilter]);

  useEffect(() => {
    loadMovements();
  }, [loadMovements]);

  const handleMovementCreated = () => {
    setModalOpen(false);
    loadOverview();
    loadMovements();
  };

  if (loading || !dashboard) {
    return <Spinner />;
  }

  return (
    <div className="stock-page">
      <div className="page-head">
        <div className="ph-l">
          <h1>Stock</h1>
          <p>Suivi des niveaux et mouvements d'inventaire</p>
        </div>
        <div className="page-actions">
          <Btn icon="plus" onClick={() => setModalOpen(true)}>
            Nouveau mouvement
          </Btn>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 14,
          marginBottom: 18,
        }}
      >
        <StatTile icon="boxes" tone="info" value={dashboard.totalProducts} label="Produits gérés" />
        <StatTile icon="bell" tone="warning" value={dashboard.lowStockCount} label="Stock bas" />
        <StatTile icon="bug" tone="danger" value={dashboard.outOfStockCount} label="En rupture" />
      </div>

      <div className="lead-grid">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <Card head="Mouvements récents" icon="activity" flush>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--line)' }}>
              <select
                className="neo-field"
                style={{ maxWidth: 220 }}
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as '' | StockMovementType)}
              >
                <option value="">Tous les types</option>
                {(Object.keys(stockMovementTypeLabels) as StockMovementType[]).map((t) => (
                  <option key={t} value={t}>
                    {stockMovementTypeLabels[t]}
                  </option>
                ))}
              </select>
            </div>
            {movLoading ? (
              <div style={{ padding: 24 }}>
                <Spinner />
              </div>
            ) : (
              <div className="tbl-wrap">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Produit</th>
                      <th>Type</th>
                      <th style={{ textAlign: 'right' }}>Qté</th>
                      <th style={{ textAlign: 'right' }}>Stock après</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movements.map((m) => (
                      <tr key={m.id}>
                        <td className="t-sub">{formatDateTime(m.createdAt)}</td>
                        <td>
                          <div className="t-main">{m.product?.name ?? '—'}</div>
                          {m.product && <div className="t-sub">{m.product.reference}</div>}
                        </td>
                        <td>
                          <Pill tone={TYPE_TONE[m.type]}>{stockMovementTypeLabels[m.type]}</Pill>
                        </td>
                        <td
                          className="t-mono"
                          style={{
                            textAlign: 'right',
                            color: m.quantity >= 0 ? 'var(--success-ink)' : 'var(--danger-ink)',
                          }}
                        >
                          {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                        </td>
                        <td className="t-mono" style={{ textAlign: 'right' }}>
                          {m.stockAfter}
                        </td>
                      </tr>
                    ))}
                    {movements.length === 0 && (
                      <tr>
                        <td colSpan={5}>
                          <div className="empty">
                            <span className="em-ic">
                              <Icon name="boxes" size={22} />
                            </span>
                            <b>Aucun mouvement</b>
                            <p>Les mouvements de stock apparaîtront ici.</p>
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
          </Card>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <Card head={`Alertes stock bas (${alerts.length})`} icon="bell" flush>
            <div className="tbl-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Produit</th>
                    <th style={{ textAlign: 'right' }}>Stock</th>
                    <th style={{ textAlign: 'right' }}>Min</th>
                  </tr>
                </thead>
                <tbody>
                  {alerts.map((a) => (
                    <tr key={a.id}>
                      <td>
                        <div className="t-main">{a.name}</div>
                        <div className="t-sub">
                          {a.reference}
                          {a.supplierName ? ` · ${a.supplierName}` : ''}
                        </div>
                      </td>
                      <td className="t-mono" style={{ textAlign: 'right' }}>
                        <span style={{ color: a.stock === 0 ? 'var(--danger-ink)' : 'var(--warning)' }}>
                          {a.stock ?? 0}
                        </span>
                      </td>
                      <td className="t-mono" style={{ textAlign: 'right' }}>
                        {a.stockMin ?? 0}
                      </td>
                    </tr>
                  ))}
                  {alerts.length === 0 && (
                    <tr>
                      <td colSpan={3}>
                        <div className="empty">
                          <span className="em-ic">
                            <Icon name="checkCircle" size={22} />
                          </span>
                          <b>Aucune alerte</b>
                          <p>Tous les stocks sont au-dessus du seuil minimum.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>

      {modalOpen && (
        <StockMovementModal onClose={() => setModalOpen(false)} onCreated={handleMovementCreated} />
      )}
    </div>
  );
}

export default StockPage;
