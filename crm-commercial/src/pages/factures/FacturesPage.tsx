import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Spinner } from '../../components';
import { Btn, Icon, Pill } from '../../components/neo';
import type { PillTone } from '../../components/neo';
import { invoicesService } from '../../services';
import { invoiceStatusLabels, type InvoiceListItem, type InvoiceStatus } from '../../types';

const PAGE_SIZE = 20;

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

export function FacturesPage() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<InvoiceListItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState<'' | InvoiceStatus>('');
  const [overdueOnly, setOverdueOnly] = useState(false);

  const loadInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const response = await invoicesService.getInvoices(
        { status: status || undefined, overdue: overdueOnly || undefined },
        page,
        PAGE_SIZE
      );
      setInvoices(response.data);
      setTotalPages(response.meta.totalPages);
      setTotal(response.meta.total);
    } catch (error) {
      console.error('Failed to load invoices:', error);
      toast.error('Impossible de charger les factures');
    } finally {
      setLoading(false);
    }
  }, [status, overdueOnly, page]);

  useEffect(() => {
    setPage(1);
  }, [status, overdueOnly]);

  useEffect(() => {
    loadInvoices();
  }, [loadInvoices]);

  const handlePdf = async (invoice: InvoiceListItem) => {
    try {
      await invoicesService.openPdf(invoice.id);
    } catch (error) {
      console.error('Failed to open PDF:', error);
      toast.error('Génération du PDF impossible');
    }
  };

  return (
    <div className="factures-page">
      <div className="page-head">
        <div className="ph-l">
          <h1>Factures</h1>
          <p>{total} factures émises</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 18 }}>
        <div className="fbar">
          <select
            className="neo-field"
            style={{ maxWidth: 220 }}
            value={status}
            onChange={(e) => setStatus(e.target.value as '' | InvoiceStatus)}
          >
            <option value="">Tous les statuts</option>
            {(Object.keys(invoiceStatusLabels) as InvoiceStatus[]).map((s) => (
              <option key={s} value={s}>
                {invoiceStatusLabels[s]}
              </option>
            ))}
          </select>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
            <input
              type="checkbox"
              checked={overdueOnly}
              onChange={(e) => setOverdueOnly(e.target.checked)}
            />
            En retard uniquement
          </label>
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
                <th>Échéance</th>
                <th>Statut</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr
                  key={inv.id}
                  onClick={() => navigate(`/factures/${inv.id}`)}
                  style={{ cursor: 'pointer' }}
                >
                  <td className="t-mono">{inv.number}</td>
                  <td className="t-sub">
                    {inv.client.firstName} {inv.client.lastName}
                  </td>
                  <td className="t-main">{inv.project.name}</td>
                  <td className="t-mono" style={{ textAlign: 'right' }}>
                    {currency.format(Number(inv.totalTTC))}
                  </td>
                  <td className="t-sub">{formatDate(inv.dueDate)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <Pill tone={STATUS_TONE[inv.status]} dot>
                        {invoiceStatusLabels[inv.status]}
                      </Pill>
                      {inv.isOverdue && <Pill tone="danger">En retard</Pill>}
                    </div>
                  </td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                      <button
                        className="icon-btn"
                        aria-label="Détail"
                        onClick={() => navigate(`/factures/${inv.id}`)}
                      >
                        <Icon name="chevronRight" size={16} />
                      </button>
                      <button
                        className="icon-btn"
                        aria-label="PDF"
                        onClick={() => handlePdf(inv)}
                      >
                        <Icon name="fileText" size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {invoices.length === 0 && (
                <tr>
                  <td colSpan={7}>
                    <div className="empty">
                      <span className="em-ic">
                        <Icon name="receipt" size={22} />
                      </span>
                      <b>Aucune facture</b>
                      <p>Les factures sont générées à partir des commandes.</p>
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

export default FacturesPage;
