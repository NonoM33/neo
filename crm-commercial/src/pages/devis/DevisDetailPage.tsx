import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Spinner } from '../../components';
import { Card, Btn, Icon, Pill } from '../../components/neo';
import type { PillTone } from '../../components/neo';
import { devisService } from '../../services';
import {
  quoteStatusLabels,
  type QuoteDetail,
  type QuoteStatus,
} from '../../types';

const STATUS_TONE: Record<QuoteStatus, PillTone> = {
  brouillon: 'neutral',
  envoye: 'info',
  accepte: 'success',
  refuse: 'danger',
  expire: 'warning',
};

const currency = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });

function formatDate(value: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('fr-FR');
}

export function DevisDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [quote, setQuote] = useState<QuoteDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [promoInput, setPromoInput] = useState('');
  const [promoBusy, setPromoBusy] = useState(false);

  const loadQuote = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      setQuote(await devisService.getQuote(id));
    } catch (error) {
      console.error('Failed to load quote:', error);
      toast.error('Devis introuvable');
      navigate('/devis');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    loadQuote();
  }, [loadQuote]);

  const handlePdf = async () => {
    if (!id) return;
    try {
      await devisService.openPdf(id);
    } catch (error) {
      console.error('Failed to open PDF:', error);
      toast.error('Génération du PDF impossible');
    }
  };

  const handleSend = async () => {
    if (!id) return;
    if (!window.confirm('Envoyer ce devis au client par email ?')) return;
    setBusy(true);
    try {
      await devisService.sendQuote(id);
      toast.success('Devis envoyé');
      await loadQuote();
    } catch (error) {
      console.error('Failed to send quote:', error);
      toast.error("Échec de l'envoi");
    } finally {
      setBusy(false);
    }
  };

  const handleApplyPromo = async () => {
    if (!id || !promoInput.trim()) return;
    setPromoBusy(true);
    try {
      const updated = await devisService.applyPromoCode(id, promoInput.trim());
      setQuote(updated);
      setPromoInput('');
      toast.success('Code promo appliqué');
    } catch (error) {
      console.error('Failed to apply promo code:', error);
      toast.error('Code promo invalide ou non applicable');
    } finally {
      setPromoBusy(false);
    }
  };

  const handleRemovePromo = async () => {
    if (!id) return;
    setPromoBusy(true);
    try {
      const updated = await devisService.removePromoCode(id);
      setQuote(updated);
      toast.success('Code promo retiré');
    } catch (error) {
      console.error('Failed to remove promo code:', error);
      toast.error('Suppression impossible');
    } finally {
      setPromoBusy(false);
    }
  };

  const handleStatusChange = async (status: QuoteStatus) => {
    if (!id || !quote || status === quote.status) return;
    setBusy(true);
    try {
      const updated = await devisService.updateStatus(id, status);
      setQuote(updated);
      toast.success('Statut mis à jour');
    } catch (error) {
      console.error('Failed to update status:', error);
      toast.error('Mise à jour impossible');
    } finally {
      setBusy(false);
    }
  };

  if (loading || !quote) {
    return <Spinner />;
  }

  return (
    <div style={{ padding: 28 }}>
      <div className="page-head">
        <div className="ph-l">
          <button className="back-link" onClick={() => navigate('/devis')}>
            <Icon name="arrowLeft" size={15} /> Retour aux devis
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1>Devis {quote.number}</h1>
            <Pill tone={STATUS_TONE[quote.status]} dot>
              {quoteStatusLabels[quote.status]}
            </Pill>
          </div>
        </div>
        <div className="page-actions">
          <Btn variant="subtle" icon="fileText" onClick={handlePdf}>
            PDF
          </Btn>
          <Btn icon="mail" disabled={busy} onClick={handleSend}>
            Envoyer au client
          </Btn>
        </div>
      </div>

      <div className="lead-grid">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <Card head="Lignes du devis" icon="fileText" flush>
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
                  {quote.lines.length === 0 ? (
                    <tr>
                      <td colSpan={4}>
                        <div className="t-sub" style={{ padding: '8px 0' }}>
                          Aucune ligne
                        </div>
                      </td>
                    </tr>
                  ) : (
                    quote.lines.map((line) => (
                      <tr key={line.id}>
                        <td>
                          <div className="t-main">{line.description}</div>
                          {line.product && <div className="t-sub">{line.product.reference}</div>}
                          {line.clientOwned && (
                            <Pill tone="neutral">Fourni par le client</Pill>
                          )}
                        </td>
                        <td className="t-mono" style={{ textAlign: 'right' }}>
                          {line.quantity ?? 1}
                        </td>
                        <td className="t-mono" style={{ textAlign: 'right' }}>
                          {currency.format(Number(line.unitPriceHT ?? 0))}
                        </td>
                        <td className="t-mono" style={{ textAlign: 'right' }}>
                          {currency.format(Number(line.totalHT ?? 0))}
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
                  <dd className="t-mono">{currency.format(Number(quote.totalHT))}</dd>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <dt>TVA</dt>
                  <dd className="t-mono">{currency.format(Number(quote.totalTVA))}</dd>
                </div>
                {quote.discount && Number(quote.discount) > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <dt>Remise</dt>
                    <dd className="t-mono">{Number(quote.discount)} %</dd>
                  </div>
                )}
                {quote.promoDiscount && Number(quote.promoDiscount) > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <dt>Code promo {quote.promoCode && <Pill tone="success">{quote.promoCode}</Pill>}</dt>
                    <dd className="t-mono" style={{ color: 'var(--success-ink)' }}>
                      −{currency.format(Number(quote.promoDiscount))}
                    </dd>
                  </div>
                )}
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
                    {currency.format(Number(quote.totalTTC))}
                  </dd>
                </div>
              </dl>
            </div>
          </Card>

          <Card head="Code promo" icon="zap">
            <div className="card-body">
              {quote.promoCode ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Pill tone="success">{quote.promoCode}</Pill>
                    <span style={{ color: 'var(--success-ink)' }}>
                      −{currency.format(Number(quote.promoDiscount ?? 0))}
                    </span>
                  </div>
                  <Btn variant="subtle" size="sm" icon="x" disabled={promoBusy} onClick={handleRemovePromo}>
                    Retirer
                  </Btn>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    className="neo-field"
                    style={{ textTransform: 'uppercase' }}
                    placeholder="Ex. NOEL10"
                    value={promoInput}
                    onChange={(e) => setPromoInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleApplyPromo()}
                  />
                  <Btn disabled={promoBusy || !promoInput.trim()} onClick={handleApplyPromo}>
                    Appliquer
                  </Btn>
                </div>
              )}
            </div>
          </Card>

          <Card head="Informations" icon="inbox">
            <div className="card-body">
              <dl className="detail-dl">
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <dt>Créé le</dt>
                  <dd>{formatDate(quote.createdAt)}</dd>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <dt>Envoyé le</dt>
                  <dd>{formatDate(quote.sentAt)}</dd>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <dt>Valide jusqu'au</dt>
                  <dd>{formatDate(quote.validUntil)}</dd>
                </div>
              </dl>
            </div>
          </Card>

          <Card head="Statut" icon="gauge">
            <div className="card-body">
              <select
                className="neo-field"
                value={quote.status}
                disabled={busy}
                onChange={(e) => handleStatusChange(e.target.value as QuoteStatus)}
              >
                {(Object.keys(quoteStatusLabels) as QuoteStatus[]).map((s) => (
                  <option key={s} value={s}>
                    {quoteStatusLabels[s]}
                  </option>
                ))}
              </select>
              {quote.notes && (
                <div style={{ marginTop: 14 }}>
                  <div className="field-label">Notes</div>
                  <p style={{ color: 'var(--ink-3)', fontSize: 13, margin: 0, lineHeight: 1.6 }}>
                    {quote.notes}
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

export default DevisDetailPage;
