import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Spinner } from '../../components';
import { Card, Btn, Icon, Pill } from '../../components/neo';
import type { PillTone } from '../../components/neo';
import { invoicesService, paymentsService } from '../../services';
import {
  invoiceStatusLabels,
  invoiceStatusTransitions,
  type InvoiceDetail,
  type InvoiceStatus,
} from '../../types';

const STATUS_TONE: Record<InvoiceStatus, PillTone> = {
  brouillon: 'neutral',
  envoyee: 'info',
  payee: 'success',
  annulee: 'danger',
};

const currency = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });

function formatDate(value: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('fr-FR');
}

export function FactureDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [payUrl, setPayUrl] = useState<string | null>(null);

  const loadInvoice = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      setInvoice(await invoicesService.getInvoice(id));
    } catch (error) {
      console.error('Failed to load invoice:', error);
      toast.error('Facture introuvable');
      navigate('/factures');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    loadInvoice();
  }, [loadInvoice]);

  const handlePdf = async () => {
    if (!id) return;
    try {
      await invoicesService.openPdf(id);
    } catch (error) {
      console.error('Failed to open PDF:', error);
      toast.error('Génération du PDF impossible');
    }
  };

  const handleSend = async () => {
    if (!id) return;
    if (!window.confirm('Envoyer cette facture au client par email ?')) return;
    setBusy(true);
    try {
      await invoicesService.sendInvoice(id);
      toast.success('Facture envoyée');
      await loadInvoice();
    } catch (error) {
      console.error('Failed to send invoice:', error);
      toast.error("Échec de l'envoi");
    } finally {
      setBusy(false);
    }
  };

  const handlePaymentLink = async () => {
    if (!id) return;
    setBusy(true);
    try {
      const { payUrl: url } = await paymentsService.createLink('invoice', id);
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

  const handleStatusChange = async (status: InvoiceStatus) => {
    if (!id || !invoice || status === invoice.status) return;
    if (status === 'annulee' && !window.confirm('Annuler cette facture ?')) return;
    setBusy(true);
    try {
      const updated = await invoicesService.changeStatus(id, status);
      setInvoice(updated);
      toast.success('Statut mis à jour');
    } catch (error) {
      console.error('Failed to update invoice status:', error);
      toast.error('Transition de statut impossible');
    } finally {
      setBusy(false);
    }
  };

  if (loading || !invoice) {
    return <Spinner />;
  }

  const nextStatuses = invoiceStatusTransitions[invoice.status];

  return (
    <div style={{ padding: 28 }}>
      <div className="page-head">
        <div className="ph-l">
          <button className="back-link" onClick={() => navigate('/factures')}>
            <Icon name="arrowLeft" size={15} /> Retour aux factures
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1>Facture {invoice.number}</h1>
            <Pill tone={STATUS_TONE[invoice.status]} dot>
              {invoiceStatusLabels[invoice.status]}
            </Pill>
            {invoice.isOverdue && <Pill tone="danger">En retard</Pill>}
          </div>
        </div>
        <div className="page-actions">
          <Btn variant="subtle" icon="fileText" onClick={handlePdf}>
            PDF
          </Btn>
          {invoice.status === 'brouillon' && (
            <Btn icon="mail" disabled={busy} onClick={handleSend}>
              Envoyer au client
            </Btn>
          )}
          {invoice.status !== 'payee' && invoice.status !== 'annulee' && (
            <Btn variant="subtle" icon="euro" disabled={busy} onClick={handlePaymentLink}>
              Lien de paiement
            </Btn>
          )}
        </div>
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
          <Card head="Lignes de la facture" icon="receipt" flush>
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
                  {invoice.lines.length === 0 ? (
                    <tr>
                      <td colSpan={4}>
                        <div className="t-sub" style={{ padding: '8px 0' }}>
                          Aucune ligne
                        </div>
                      </td>
                    </tr>
                  ) : (
                    invoice.lines.map((line) => (
                      <tr key={line.id}>
                        <td>
                          <div className="t-main">{line.description}</div>
                          {line.reference && <div className="t-sub">{line.reference}</div>}
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
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <Card head="Récapitulatif" icon="euro">
            <div className="card-body">
              <dl className="detail-dl">
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <dt>Total HT</dt>
                  <dd className="t-mono">{currency.format(Number(invoice.totalHT))}</dd>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <dt>TVA</dt>
                  <dd className="t-mono">{currency.format(Number(invoice.totalTVA))}</dd>
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
                    {currency.format(Number(invoice.totalTTC))}
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
                    {invoice.client.firstName} {invoice.client.lastName}
                  </dd>
                </div>
                {invoice.client.email && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <dt>Email</dt>
                    <dd>{invoice.client.email}</dd>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <dt>Projet</dt>
                  <dd>
                    <button
                      onClick={() => navigate(`/projets/${invoice.projectId}/edit`)}
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: 0,
                        color: 'var(--komun)',
                        cursor: 'pointer',
                        font: 'inherit',
                      }}
                    >
                      {invoice.project.name}
                    </button>
                  </dd>
                </div>
              </dl>
            </div>
          </Card>

          <Card head="Paiement" icon="euro">
            <div className="card-body">
              <dl className="detail-dl">
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <dt>Échéance</dt>
                  <dd>{formatDate(invoice.dueDate)}</dd>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <dt>Conditions</dt>
                  <dd>{invoice.paymentTerms ?? '—'}</dd>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <dt>Moyen</dt>
                  <dd>{invoice.paymentMethod ?? '—'}</dd>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <dt>Envoyée le</dt>
                  <dd>{formatDate(invoice.sentAt)}</dd>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <dt>Payée le</dt>
                  <dd>{formatDate(invoice.paidAt)}</dd>
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
                  value={invoice.status}
                  disabled={busy}
                  onChange={(e) => handleStatusChange(e.target.value as InvoiceStatus)}
                >
                  <option value={invoice.status}>
                    {invoiceStatusLabels[invoice.status]} (actuel)
                  </option>
                  {nextStatuses.map((s) => (
                    <option key={s} value={s}>
                      → {invoiceStatusLabels[s]}
                    </option>
                  ))}
                </select>
              )}
              {invoice.notes && (
                <div style={{ marginTop: 14 }}>
                  <div className="field-label">Notes</div>
                  <p style={{ color: 'var(--ink-3)', fontSize: 13, margin: 0, lineHeight: 1.6 }}>
                    {invoice.notes}
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

export default FactureDetailPage;
