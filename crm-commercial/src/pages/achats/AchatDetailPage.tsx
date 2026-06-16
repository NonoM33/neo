import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Spinner } from '../../components';
import { Btn, Card, Icon, Pill } from '../../components/neo';
import type { PillTone } from '../../components/neo';
import { supplierOrdersService } from '../../services';
import {
  supplierOrderStatusLabels,
  supplierOrderStatusTransitions,
  type ReceptionLineInput,
  type SupplierOrderDetail,
  type SupplierOrderStatus,
} from '../../types';

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

export function AchatDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [order, setOrder] = useState<SupplierOrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [receiving, setReceiving] = useState(false);
  const [received, setReceived] = useState<Record<string, number>>({});
  const [receptionNotes, setReceptionNotes] = useState('');

  const loadOrder = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      setOrder(await supplierOrdersService.getSupplierOrder(id));
    } catch (error) {
      console.error('Failed to load supplier order:', error);
      toast.error('Commande fournisseur introuvable');
      navigate('/achats');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    loadOrder();
  }, [loadOrder]);

  const handleStatusChange = async (status: SupplierOrderStatus) => {
    if (!id || !order || status === order.status) return;
    if (status === 'annulee' && !window.confirm('Annuler cette commande fournisseur ?')) return;
    setBusy(true);
    try {
      const updated = await supplierOrdersService.changeStatus(id, status);
      setOrder(updated);
      toast.success('Statut mis à jour');
    } catch (error) {
      console.error('Failed to update supplier order status:', error);
      toast.error('Transition de statut impossible');
    } finally {
      setBusy(false);
    }
  };

  const receptionLines = useMemo<ReceptionLineInput[]>(() => {
    if (!order) return [];
    return order.lines
      .map((line) => ({ lineId: line.id, quantityReceived: received[line.id] ?? 0 }))
      .filter((l) => l.quantityReceived > 0);
  }, [order, received]);

  const handleReceive = async () => {
    if (!id || receptionLines.length === 0) return;
    setReceiving(true);
    try {
      const updated = await supplierOrdersService.receive(
        id,
        receptionLines,
        receptionNotes.trim() || undefined
      );
      setOrder(updated);
      setReceived({});
      setReceptionNotes('');
      toast.success('Réception enregistrée');
    } catch (error) {
      console.error('Failed to record reception:', error);
      toast.error('Réception impossible');
    } finally {
      setReceiving(false);
    }
  };

  if (loading || !order) {
    return <Spinner />;
  }

  const nextStatuses = supplierOrderStatusTransitions[order.status];
  const canReceive = order.status === 'confirmee';

  return (
    <div style={{ padding: 28 }}>
      <div className="page-head">
        <div className="ph-l">
          <button className="back-link" onClick={() => navigate('/achats')}>
            <Icon name="arrowLeft" size={15} /> Retour aux achats
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1>Commande {order.number}</h1>
            <Pill tone={STATUS_TONE[order.status]} dot>
              {supplierOrderStatusLabels[order.status]}
            </Pill>
          </div>
        </div>
      </div>

      <div className="lead-grid">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <Card head="Lignes de la commande" icon="package" flush>
            <div className="tbl-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Produit</th>
                    <th style={{ textAlign: 'right' }}>Commandé</th>
                    <th style={{ textAlign: 'right' }}>Reçu</th>
                    <th style={{ textAlign: 'right' }}>PU HT</th>
                    <th style={{ textAlign: 'right' }}>Total HT</th>
                  </tr>
                </thead>
                <tbody>
                  {order.lines.length === 0 ? (
                    <tr>
                      <td colSpan={5}>
                        <div className="t-sub" style={{ padding: '8px 0' }}>
                          Aucune ligne
                        </div>
                      </td>
                    </tr>
                  ) : (
                    order.lines.map((line) => (
                      <tr key={line.id}>
                        <td>
                          <div className="t-main">{line.product.name}</div>
                          <div className="t-sub">{line.product.reference}</div>
                        </td>
                        <td className="t-mono" style={{ textAlign: 'right' }}>
                          {line.quantityOrdered}
                        </td>
                        <td
                          className="t-mono"
                          style={{
                            textAlign: 'right',
                            color:
                              line.quantityReceived >= line.quantityOrdered
                                ? 'var(--success-ink)'
                                : 'var(--ink-3)',
                          }}
                        >
                          {line.quantityReceived}
                        </td>
                        <td className="t-mono" style={{ textAlign: 'right' }}>
                          {currency.format(Number(line.unitPriceHT))}
                        </td>
                        <td className="t-mono" style={{ textAlign: 'right' }}>
                          {currency.format(Number(line.totalHT))}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          {canReceive && (
            <Card head="Réceptionner la marchandise" icon="truck" flush>
              <div className="tbl-wrap">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Produit</th>
                      <th style={{ textAlign: 'right' }}>Reste à recevoir</th>
                      <th style={{ textAlign: 'right' }}>Quantité reçue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.lines.map((line) => {
                      const remaining = line.quantityOrdered - line.quantityReceived;
                      return (
                        <tr key={line.id}>
                          <td>
                            <div className="t-main">{line.product.name}</div>
                            <div className="t-sub">{line.product.reference}</div>
                          </td>
                          <td className="t-mono" style={{ textAlign: 'right' }}>
                            {remaining}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <input
                              type="number"
                              className="neo-field"
                              style={{ maxWidth: 110, marginLeft: 'auto' }}
                              min={0}
                              max={remaining}
                              value={received[line.id] ?? ''}
                              disabled={remaining <= 0 || receiving}
                              onChange={(e) => {
                                const raw = Number(e.target.value);
                                const clamped = Number.isFinite(raw)
                                  ? Math.max(0, Math.min(remaining, Math.floor(raw)))
                                  : 0;
                                setReceived((prev) => ({ ...prev, [line.id]: clamped }));
                              }}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="card-body">
                <div className="field-label">Notes de réception</div>
                <textarea
                  className="neo-field"
                  rows={2}
                  value={receptionNotes}
                  disabled={receiving}
                  onChange={(e) => setReceptionNotes(e.target.value)}
                  placeholder="Optionnel"
                />
                <div style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-end' }}>
                  <Btn
                    icon="check"
                    disabled={receptionLines.length === 0 || receiving}
                    onClick={handleReceive}
                  >
                    Enregistrer la réception
                  </Btn>
                </div>
              </div>
            </Card>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <Card head="Récapitulatif" icon="euro">
            <div className="card-body">
              <dl className="detail-dl">
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <dt>Total HT</dt>
                  <dd className="t-mono">{currency.format(Number(order.totalHT))}</dd>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <dt>TVA</dt>
                  <dd className="t-mono">{currency.format(Number(order.totalTVA))}</dd>
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    paddingTop: 10,
                    borderTop: '1px solid var(--line)',
                  }}
                >
                  <dt style={{ color: 'var(--ink)', fontWeight: 600, textTransform: 'none', fontSize: 14 }}>
                    Total TTC
                  </dt>
                  <dd className="t-mono" style={{ fontWeight: 600 }}>
                    {currency.format(Number(order.totalTTC))}
                  </dd>
                </div>
              </dl>
            </div>
          </Card>

          <Card head="Fournisseur" icon="building">
            <div className="card-body">
              <dl className="detail-dl">
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <dt>Nom</dt>
                  <dd>{order.supplier.name}</dd>
                </div>
                {order.supplier.contactName && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <dt>Contact</dt>
                    <dd>{order.supplier.contactName}</dd>
                  </div>
                )}
                {order.supplier.email && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <dt>Email</dt>
                    <dd>{order.supplier.email}</dd>
                  </div>
                )}
                {order.supplier.phone && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <dt>Téléphone</dt>
                    <dd>{order.supplier.phone}</dd>
                  </div>
                )}
                {order.supplierReference && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <dt>Réf. fournisseur</dt>
                    <dd className="t-mono">{order.supplierReference}</dd>
                  </div>
                )}
              </dl>
            </div>
          </Card>

          <Card head="Informations" icon="inbox">
            <div className="card-body">
              <dl className="detail-dl">
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <dt>Créée le</dt>
                  <dd>{formatDate(order.createdAt)}</dd>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <dt>Livraison prévue</dt>
                  <dd>{formatDate(order.expectedDeliveryDate)}</dd>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <dt>Envoyée le</dt>
                  <dd>{formatDate(order.sentAt)}</dd>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <dt>Confirmée le</dt>
                  <dd>{formatDate(order.confirmedAt)}</dd>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <dt>Reçue le</dt>
                  <dd>{formatDate(order.receivedAt)}</dd>
                </div>
              </dl>
            </div>
          </Card>

          <Card head="Changer le statut" icon="gauge">
            <div className="card-body">
              {nextStatuses.length === 0 ? (
                <p style={{ color: 'var(--ink-3)', fontSize: 13, margin: 0 }}>
                  Aucune transition possible depuis ce statut.
                </p>
              ) : (
                <select
                  className="neo-field"
                  value={order.status}
                  disabled={busy}
                  onChange={(e) => handleStatusChange(e.target.value as SupplierOrderStatus)}
                >
                  <option value={order.status}>
                    {supplierOrderStatusLabels[order.status]} (actuel)
                  </option>
                  {nextStatuses.map((s) => (
                    <option key={s} value={s}>
                      → {supplierOrderStatusLabels[s]}
                    </option>
                  ))}
                </select>
              )}
              {order.notes && (
                <div style={{ marginTop: 14 }}>
                  <div className="field-label">Notes</div>
                  <p style={{ color: 'var(--ink-3)', fontSize: 13, margin: 0, lineHeight: 1.6 }}>
                    {order.notes}
                  </p>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default AchatDetailPage;
