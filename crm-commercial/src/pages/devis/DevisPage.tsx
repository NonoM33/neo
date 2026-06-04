import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Card, CardBody, Table, Button } from '../../components';
import { devisService } from '../../services';
import { quoteStatusLabels, type QuoteListItem, type QuoteStatus } from '../../types';

const PAGE_SIZE = 20;

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
    <div className="content-area">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="page-title">Devis</h1>
          <p className="text-secondary mb-0">
            {total} devis
          </p>
        </div>
      </div>

      <Card className="mb-4">
        <CardBody>
          <div className="row g-3">
            <div className="col-md-8">
              <div className="input-group">
                <span className="input-group-text bg-transparent">
                  <i className="bi bi-search"></i>
                </span>
                <input
                  type="search"
                  className="form-control"
                  placeholder="Rechercher par numéro ou client…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
            <div className="col-md-4">
              <select
                className="form-select"
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
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <Table<QuoteListItem>
            loading={loading}
            data={quotes}
            keyExtractor={(q) => q.id}
            emptyMessage="Aucun devis"
            onRowClick={(q) => navigate(`/devis/${q.id}`)}
            columns={[
              {
                key: 'number',
                header: 'Numéro',
                render: (q) => <span className="fw-semibold">{q.number}</span>,
              },
              {
                key: 'client',
                header: 'Client',
                render: (q) => `${q.client.firstName} ${q.client.lastName}`,
              },
              { key: 'project', header: 'Projet', render: (q) => q.project.name },
              {
                key: 'totalTTC',
                header: 'Total TTC',
                render: (q) => currency.format(Number(q.totalTTC)),
              },
              {
                key: 'status',
                header: 'Statut',
                render: (q) => (
                  <span className={`badge bg-${STATUS_VARIANT[q.status]}`}>
                    {quoteStatusLabels[q.status]}
                  </span>
                ),
              },
              { key: 'createdAt', header: 'Créé le', render: (q) => formatDate(q.createdAt) },
              {
                key: 'actions',
                header: '',
                className: 'text-end',
                render: (q) => (
                  <div className="d-flex gap-2 justify-content-end">
                    <Button
                      variant="outline-secondary"
                      size="sm"
                      icon="bi-eye"
                      onClick={() => navigate(`/devis/${q.id}`)}
                    >
                      Détail
                    </Button>
                    <Button
                      variant="outline-secondary"
                      size="sm"
                      icon="bi-file-earmark-pdf"
                      onClick={() => handlePdf(q)}
                    >
                      PDF
                    </Button>
                  </div>
                ),
              },
            ]}
          />

          {totalPages > 1 && (
            <div className="d-flex justify-content-between align-items-center mt-3">
              <span className="text-secondary small">
                Page {page} / {totalPages}
              </span>
              <div className="btn-group">
                <Button
                  variant="outline-secondary"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Précédent
                </Button>
                <Button
                  variant="outline-secondary"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Suivant
                </Button>
              </div>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

export default DevisPage;
