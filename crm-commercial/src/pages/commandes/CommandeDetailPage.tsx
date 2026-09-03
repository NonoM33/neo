import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Spinner } from '../../components';
import { Card, Btn, Icon, Pill } from '../../components/neo';
import type { PillTone } from '../../components/neo';
import { ordersService, paymentsService } from '../../services';
import {
  orderStatusLabels,
  orderStatusTransitions,
  type OrderDetail,
  type OrderStatus,
} from '../../types';

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

function formatDateTime(value: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleString('fr-FR');
}

export function CommandeDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [payUrl, setPayUrl] = useState<string | null>(null);

  const handlePaymentLink = async () => {
    if (!id) return;
    setBusy(true);
    try {
      const { payUrl: url } = await paymentsService.createLink('order', id);
      setPayUrl(url);
      try {
        await navigator.clipboard.writeText(url);
        toast.success('Lien de paiement copié dans le presse-papier');
      } catch {
        toast.success('Lien de paiement généré');
      }
    } catch (error) {
      console.error('Failed to create payment link:', error);
      toast.error('Génération du lien de paiement impossible');
    } finally {
      setBusy(false);
    }
  };

  const loadOrder = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      setOrder(await ordersService.getOrder(id));
    } catch (error) {
      console.error('Failed to load order:', error);
      toast.error('Commande introuvable');
      navigate('/commandes');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    loadOrder();
  }, [loadOrder]);

  const handleStatusChange = async (status: OrderStatus) => {
    if (!id || !order || status === order.status) return;
    if (status === 'annulee' && !window.confirm('Annuler cette commande ?')) return;
    setBusy(true);
    try {
      const updated = await ordersService.changeStatus(id, status);
      setOrder(updated);
      toast.success('Statut mis à jour');
    } catch (error) {
      console.error('Failed to update order status:', error);
      toast.error('Transition de statut impossible');
    } finally {
      setBusy(false);
    }
  };

  if (loading || !order) {
    return <Spinner />;
  }

  const nextStatuses = orderStatusTransitions[order.status];

  return (
    <div style={{ padding: 28 }}>
      <div className="page-head">
        <div className="ph-l">
          <button className="back-link" onClick={() => navigate('/commandes')}>
            <Icon name="arrowLeft" size={15} /> Retour aux commandes
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1>Commande {order.number}</h1>
            <Pill tone={STATUS_TONE[order.status]} dot>
              {orderStatusLabels[order.status]}
            </Pill>
          </div>
        </div>
        {order.status !== 'payee' && order.status !== 'annulee' && (
          <div className="page-actions">
            <Btn variant="subtle" icon="euro" disabled={busy} onClick={handlePaymentLink}>
              Lien de paiement
            </Btn>
          </div>
        )}
      </div>

      {payUrl && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '12px 16px',
            marginBottom: 18,
            background: 'var(--neo-primary-light, rgba(13,110,253,0.08))',
            border: '1px solid var(--line, #e9ecef)',
            borderRadius: 10,
          }}
        >
          <Icon name="euro" size={16} />
          <input
            readOnly
            value={payUrl}
            onFocus={(e) => e.currentTarget.select()}
            className="neo-field"
            style={{ flex: 1, fontFamily: 'monospace', fontSize: 13 }}
          />
          <Btn
            variant="subtle"
            icon="fileText"
            onClick={() => {
              navigator.clipboard.writeText(payUrl).then(
                () => toast.success('Lien copié'),
                () => toast.error('Copie impossible')
              );
            }}
          >
            Copier
          </Btn>
        </div>
      )}

      <div className="lead-grid">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <Card head="Lignes de la commande" icon="cart" flush>
            <div className="tbl-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Désignation</th>
                    <th style={{ textAlign: 'right' }}>Qté</th>
                    <th style={{ textAlign: 'right' }}>PU HT</th>
                    <th style={{ textAlign: 'right' }}>Total HT</th>
                  </tr>
                </thead>
                <tbody>
                  {order.lines.length === 0 ? (
                    <tr>
                      <td colSpan={4}>
                        <div className="t-sub" style={{ padding: '8px 0' }}>
                          Aucune ligne
                        </div>
                      </td>
                    </tr>
                  ) : (
                    order.lines.map((line) => (
                      <tr key={line.id}>
                        <td>
                          <div className="t-main">{line.description}</div>
                          {line.product && <div className="t-sub">{line.product.reference}</div>}
                        </td>
                        <td className="t-mono" style={{ textAlign: 'right' }}>
                          {line.quantity}
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

          <Card head="Historique des statuts" icon="activity" flush>
            <div className="tbl-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>De</th>
                    <th>Vers</th>
                    <th>Note</th>
                  </tr>
                </thead>
                <tbody>
                  {order.history.length === 0 ? (
                    <tr>
                      <td colSpan={4}>
                        <div className="t-sub" style={{ padding: '8px 0' }}>
                          Aucun historique
                        </div>
                      </td>
                    </tr>
                  ) : (
                    order.history.map((h) => (
                      <tr key={h.id}>
                        <td className="t-sub">{formatDateTime(h.changedAt)}</td>
                        <td className="t-sub">
                          {h.fromStatus ? orderStatusLabels[h.fromStatus] : '—'}
                        </td>
                        <td>
                          <Pill tone={STATUS_TONE[h.toStatus]}>
                            {orderStatusLabels[h.toStatus]}
                          </Pill>
                        </td>
                        <td className="t-sub">{h.notes ?? '—'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
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
                {order.discount && Number(order.discount) > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <dt>Remise</dt>
                    <dd className="t-mono">{Number(order.discount)} %</dd>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <dt>Marge HT</dt>
                  <dd className="t-mono">{currency.format(Number(order.totalMarginHT))}</dd>
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

          <Card head="Client & projet" icon="users">
            <div className="card-body">
              <dl className="detail-dl">
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <dt>Client</dt>
                  <dd>
                    {order.client.firstName} {order.client.lastName}
                  </dd>
                </div>
                {order.client.email && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <dt>Email</dt>
                    <dd>{order.client.email}</dd>
                  </div>
                )}
                {order.client.phone && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <dt>Téléphone</dt>
                    <dd>{order.client.phone}</dd>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <dt>Projet</dt>
                  <dd>
                    <button
                      onClick={() => navigate(`/projets/${order.projectId}/edit`)}
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: 0,
                        color: 'var(--komun)',
                        cursor: 'pointer',
                        font: 'inherit',
                      }}
                    >
                      {order.project.name}
                    </button>
                  </dd>
                </div>
              </dl>
            </div>
          </Card>

          {(order.shippingAddress || order.carrier || order.trackingNumber) && (
            <Card head="Livraison" icon="truck">
              <div className="card-body">
                <dl className="detail-dl">
                  {order.shippingAddress && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <dt>Adresse</dt>
                      <dd style={{ textAlign: 'right' }}>
                        {order.shippingAddress}
                        <br />
                        {order.shippingPostalCode} {order.shippingCity}
                      </dd>
                    </div>
                  )}
                  {order.carrier && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <dt>Transporteur</dt>
                      <dd>{order.carrier}</dd>
                    </div>
                  )}
                  {order.trackingNumber && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <dt>Suivi</dt>
                      <dd className="t-mono">{order.trackingNumber}</dd>
                    </div>
                  )}
                </dl>
              </div>
            </Card>
          )}

          <Card head="Informations" icon="inbox">
            <div className="card-body">
              <dl className="detail-dl">
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <dt>Créée le</dt>
                  <dd>{formatDate(order.createdAt)}</dd>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <dt>Confirmée le</dt>
                  <dd>{formatDate(order.confirmedAt)}</dd>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <dt>Payée le</dt>
                  <dd>{formatDate(order.paidAt)}</dd>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <dt>Expédiée le</dt>
                  <dd>{formatDate(order.shippedAt)}</dd>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <dt>Livrée le</dt>
                  <dd>{formatDate(order.deliveredAt)}</dd>
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
                  onChange={(e) => handleStatusChange(e.target.value as OrderStatus)}
                >
                  <option value={order.status}>
                    {orderStatusLabels[order.status]} (actuel)
                  </option>
                  {nextStatuses.map((s) => (
                    <option key={s} value={s}>
                      → {orderStatusLabels[s]}
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

export default CommandeDetailPage;
