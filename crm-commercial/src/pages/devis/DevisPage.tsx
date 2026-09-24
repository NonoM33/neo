import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Spinner } from '../../components';
import { Btn, Icon, Pill } from '../../components/neo';
import type { PillTone } from '../../components/neo';
import { devisService } from '../../services';
import { quoteStatusLabels, type QuoteListItem, type QuoteStatus } from '../../types';

const PAGE_SIZE = 20;

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

export function DevisPage() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [quotes, setQuotes] = useState<QuoteListItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'' | QuoteStatus>('');

  const loadQuotes = useCallback(async () => {
    setLoading(true);
    try {
      const response = await devisService.getQuotes(
        { search: search.trim() || undefined, status: status || undefined },
        page,
        PAGE_SIZE
      );
      setQuotes(response.data);
      setTotalPages(response.meta.totalPages);
      setTotal(response.meta.total);
    } catch (error) {
      console.error('Failed to load quotes:', error);
      toast.error('Impossible de charger les devis');
    } finally {
      setLoading(false);
    }
  }, [search, status, page]);

  useEffect(() => {
    const handle = setTimeout(() => setPage(1), 300);
    return () => clearTimeout(handle);
  }, [search, status]);

  useEffect(() => {
    loadQuotes();
  }, [loadQuotes]);

  const handlePdf = async (quote: QuoteListItem) => {
    try {
      await devisService.openPdf(quote.id);
    } catch (error) {
      console.error('Failed to open PDF:', error);
      toast.error('Génération du PDF impossible');
    }
  };

  return (
    <div className="devis-page">
      <div className="page-head">
        <div className="ph-l">
          <h1>Devis</h1>
          <p>
            {total} devis émis
          </p>
        </div>
        <div className="ph-r">
          <Btn icon="plus" onClick={() => navigate('/devis/new')}>
            Nouveau devis
          </Btn>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 18 }}>
        <div className="fbar">
          <div className="fbar-search">
            <Icon name="search" size={16} />
            <input
              type="search"
              className="neo-field"
              placeholder="Rechercher par numéro ou client…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="neo-field"
            style={{ maxWidth: 220 }}
            value={status}
            onChange={(e) => setStatus(e.target.value as '' | QuoteStatus)}
          >
            <option value="">Tous les statuts</option>
            {(Object.keys(quoteStatusLabels) as QuoteStatus[]).map((s) => (
              <option key={s} value={s}>
                {quoteStatusLabels[s]}
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
                <th>Créé le</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {quotes.map((q) => (
                <tr
                  key={q.id}
                  onClick={() => navigate(`/devis/${q.id}`)}
                  style={{ cursor: 'pointer' }}
                >
                  <td className="t-mono">{q.number}</td>
                  <td className="t-sub">
                    {q.client.firstName} {q.client.lastName}
                  </td>
                  <td className="t-main">{q.project.name}</td>
                  <td className="t-mono" style={{ textAlign: 'right' }}>
                    {currency.format(Number(q.totalTTC))}
                  </td>
                  <td>
                    <Pill tone={STATUS_TONE[q.status]} dot>
                      {quoteStatusLabels[q.status]}
                    </Pill>
                  </td>
                  <td className="t-sub">{formatDate(q.createdAt)}</td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                      <button
                        className="icon-btn"
                        aria-label="Détail"
                        onClick={() => navigate(`/devis/${q.id}`)}
                      >
                        <Icon name="chevronRight" size={16} />
                      </button>
                      <button className="icon-btn" aria-label="PDF" onClick={() => handlePdf(q)}>
                        <Icon name="fileText" size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {quotes.length === 0 && (
                <tr>
                  <td colSpan={7}>
                    <div className="empty">
                      <span className="em-ic">
                        <Icon name="receipt" size={22} />
                      </span>
                      <b>Aucun devis</b>
                      <p>Ajustez vos filtres ou créez un devis depuis un projet.</p>
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

export default DevisPage;
