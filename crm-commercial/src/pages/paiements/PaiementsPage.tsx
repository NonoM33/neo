import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Spinner } from '../../components';
import { Btn, Icon, Pill } from '../../components/neo';
import type { PillTone } from '../../components/neo';
import { paymentsService } from '../../services';
import type {
  Payment,
  PaymentStatus,
  PaymentTargetType,
} from '../../services/payments.service';

const PAGE_SIZE = 20;

const STATUS_TONE: Record<PaymentStatus, PillTone> = {
  pending: 'neutral',
  processing: 'info',
  succeeded: 'success',
  failed: 'danger',
  canceled: 'neutral',
  expired: 'warning',
};

const STATUS_LABEL: Record<PaymentStatus, string> = {
  pending: 'En attente',
  processing: 'En cours',
  succeeded: 'Payé',
  failed: 'Échoué',
  canceled: 'Annulé',
  expired: 'Expiré',
};

const TARGET_LABEL: Record<PaymentTargetType, string> = {
  invoice: 'Facture',
  order: 'Commande',
  quote_deposit: 'Acompte devis',
};

const currency = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });

function formatDateTime(value: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleString('fr-FR');
}

export function PaiementsPage() {
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState<'' | PaymentStatus>('');

  const loadPayments = useCallback(async () => {
    setLoading(true);
    try {
      const response = await paymentsService.list(
        { status: status || undefined },
        page,
        PAGE_SIZE
      );
      setPayments(response.data);
      setTotalPages(response.meta.totalPages);
      setTotal(response.meta.total);
    } catch (error) {
      console.error('Failed to load payments:', error);
      toast.error('Impossible de charger les paiements');
    } finally {
      setLoading(false);
    }
  }, [status, page]);

  useEffect(() => {
    setPage(1);
  }, [status]);

  useEffect(() => {
    loadPayments();
  }, [loadPayments]);

  return (
    <div className="paiements-page">
      <div className="page-head">
        <div className="ph-l">
          <h1>Paiements</h1>
          <p>{total} paiements Stripe</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 18 }}>
        <div className="fbar">
          <select
            className="neo-field"
            style={{ maxWidth: 220 }}
            value={status}
            onChange={(e) => setStatus(e.target.value as '' | PaymentStatus)}
          >
            <option value="">Tous les statuts</option>
            {(Object.keys(STATUS_LABEL) as PaymentStatus[]).map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
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
                <th>Date</th>
                <th>Référence</th>
                <th>Type</th>
                <th style={{ textAlign: 'right' }}>Montant</th>
                <th>Client</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id}>
                  <td className="t-sub">{formatDateTime(p.paidAt ?? p.createdAt)}</td>
                  <td className="t-main">{p.description ?? '—'}</td>
                  <td className="t-sub">{TARGET_LABEL[p.targetType]}</td>
                  <td className="t-mono" style={{ textAlign: 'right' }}>
                    {currency.format(p.amountCents / 100)}
                  </td>
                  <td className="t-sub">{p.customerEmail ?? '—'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <Pill tone={STATUS_TONE[p.status]} dot>
                        {STATUS_LABEL[p.status]}
                      </Pill>
                      {p.receiptUrl && (
                        <a
                          href={p.receiptUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="icon-btn"
                          aria-label="Reçu"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Icon name="fileText" size={16} />
                        </a>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {payments.length === 0 && (
                <tr>
                  <td colSpan={6}>
                    <div className="empty">
                      <span className="em-ic">
                        <Icon name="euro" size={22} />
                      </span>
                      <b>Aucun paiement</b>
                      <p>
                        Les paiements apparaissent dès qu'un lien Stripe est généré depuis une
                        facture, une commande ou un devis.
                      </p>
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

export default PaiementsPage;
