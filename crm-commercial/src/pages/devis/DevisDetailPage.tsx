import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Card, CardBody, Table, Button, Spinner } from '../../components';
import { devisService } from '../../services';
import {
  quoteStatusLabels,
  type QuoteDetail,
  type QuoteLine,
  type QuoteStatus,
} from '../../types';

const STATUS_VARIANT: Record<QuoteStatus, string> = {
  brouillon: 'secondary',
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
    return (
      <div className="content-area">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="content-area">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div className="d-flex align-items-center gap-2">
          <Button
            variant="outline-secondary"
            size="sm"
            icon="bi-arrow-left"
            onClick={() => navigate('/devis')}
          >
            Retour
          </Button>
          <h1 className="page-title mb-0">Devis {quote.number}</h1>
          <span className={`badge bg-${STATUS_VARIANT[quote.status]}`}>
            {quoteStatusLabels[quote.status]}
          </span>
        </div>
        <div className="d-flex gap-2">
          <Button variant="outline-secondary" icon="bi-file-earmark-pdf" onClick={handlePdf}>
            PDF
          </Button>
          <Button icon="bi-envelope" loading={busy} onClick={handleSend}>
            Envoyer au client
          </Button>
        </div>
      </div>

      <div className="row g-4">
        <div className="col-lg-8">
          <Card>
            <CardBody>
              <h2 className="card-title h5 mb-3">Lignes du devis</h2>
              <Table<QuoteLine>
                data={quote.lines}
                keyExtractor={(line) => line.id}
                emptyMessage="Aucune ligne"
                columns={[
                  {
                    key: 'description',
                    header: 'Désignation',
                    render: (line) => (
                      <div>
                        <div className="fw-semibold">{line.description}</div>
                        {line.product && (
                          <small className="text-secondary">{line.product.reference}</small>
                        )}
                        {line.clientOwned && (
                          <span className="badge border text-body-secondary ms-2">
                            Fourni par le client
                          </span>
                        )}
                      </div>
                    ),
                  },
                  {
                    key: 'quantity',
                    header: 'Qté',
                    className: 'text-end',
                    render: (line) => line.quantity ?? 1,
                  },
                  {
                    key: 'unitPriceHT',
                    header: 'PU HT',
                    className: 'text-end',
                    render: (line) => currency.format(Number(line.unitPriceHT ?? 0)),
                  },
                  {
                    key: 'totalHT',
                    header: 'Total HT',
                    className: 'text-end',
                    render: (line) => currency.format(Number(line.totalHT ?? 0)),
                  },
                ]}
              />
            </CardBody>
          </Card>
        </div>

        <div className="col-lg-4">
          <Card className="mb-4">
            <CardBody>
              <h2 className="card-title h5 mb-3">Récapitulatif</h2>
              <dl className="row mb-0">
                <dt className="col-6 text-secondary fw-normal">Total HT</dt>
                <dd className="col-6 text-end">{currency.format(Number(quote.totalHT))}</dd>
                <dt className="col-6 text-secondary fw-normal">TVA</dt>
                <dd className="col-6 text-end">{currency.format(Number(quote.totalTVA))}</dd>
                {quote.discount && Number(quote.discount) > 0 && (
                  <>
                    <dt className="col-6 text-secondary fw-normal">Remise</dt>
                    <dd className="col-6 text-end">{Number(quote.discount)} %</dd>
                  </>
                )}
                {quote.promoDiscount && Number(quote.promoDiscount) > 0 && (
                  <>
                    <dt className="col-6 text-secondary fw-normal">
                      Code promo {quote.promoCode && <span className="badge bg-success ms-1">{quote.promoCode}</span>}
                    </dt>
                    <dd className="col-6 text-end text-success">
                      −{currency.format(Number(quote.promoDiscount))}
                    </dd>
                  </>
                )}
                <dt className="col-6 fw-semibold">Total TTC</dt>
                <dd className="col-6 text-end fw-semibold">
                  {currency.format(Number(quote.totalTTC))}
                </dd>
              </dl>
            </CardBody>
          </Card>

          <Card className="mb-4">
            <CardBody>
              <h2 className="card-title h5 mb-3">Code promo</h2>
              {quote.promoCode ? (
                <div className="d-flex align-items-center justify-content-between">
                  <div>
                    <span className="badge bg-success me-2">{quote.promoCode}</span>
                    <span className="text-success">
                      −{currency.format(Number(quote.promoDiscount ?? 0))}
                    </span>
                  </div>
                  <Button
                    variant="outline-secondary"
                    size="sm"
                    icon="bi-x-lg"
                    loading={promoBusy}
                    onClick={handleRemovePromo}
                  >
                    Retirer
                  </Button>
                </div>
              ) : (
                <div className="d-flex gap-2">
                  <input
                    className="form-control text-uppercase"
                    placeholder="Ex. NOEL10"
                    value={promoInput}
                    onChange={(e) => setPromoInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleApplyPromo()}
                  />
                  <Button loading={promoBusy} onClick={handleApplyPromo} disabled={!promoInput.trim()}>
                    Appliquer
                  </Button>
                </div>
              )}
            </CardBody>
          </Card>

          <Card className="mb-4">
            <CardBody>
              <h2 className="card-title h5 mb-3">Informations</h2>
              <dl className="row mb-0">
                <dt className="col-6 text-secondary fw-normal">Créé le</dt>
                <dd className="col-6 text-end">{formatDate(quote.createdAt)}</dd>
                <dt className="col-6 text-secondary fw-normal">Envoyé le</dt>
                <dd className="col-6 text-end">{formatDate(quote.sentAt)}</dd>
                <dt className="col-6 text-secondary fw-normal">Valide jusqu'au</dt>
                <dd className="col-6 text-end">{formatDate(quote.validUntil)}</dd>
              </dl>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <label className="form-label">Statut</label>
              <select
                className="form-select"
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
                <div className="mt-3">
                  <label className="form-label">Notes</label>
                  <p className="text-secondary mb-0">{quote.notes}</p>
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default DevisDetailPage;
