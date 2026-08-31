import type { FC } from 'hono/jsx';
import { Layout, Table, Pagination, PaginationInfo, FlashMessages } from '../../components';
import type { AdminUser } from '../../middleware/admin-auth';

interface QuoteRow {
  id: string;
  number: string;
  status: string;
  totalTTC: string | null;
  createdAt: Date | null;
  sentAt: Date | null;
  validUntil: Date | null;
  project: { id: string; name: string };
  client: { firstName: string; lastName: string; email: string | null };
}

interface QuotesListPageProps {
  quotes: QuoteRow[];
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  search?: string;
  status?: string;
  success?: string;
  error?: string;
  user: AdminUser;
}

const statusLabels: Record<string, { label: string; color: string }> = {
  brouillon: { label: 'Brouillon', color: 'secondary' },
  envoye: { label: 'Envoye', color: 'info' },
  accepte: { label: 'Accepte', color: 'success' },
  refuse: { label: 'Refuse', color: 'danger' },
  expire: { label: 'Expire', color: 'warning' },
};

export const QuotesListPage: FC<QuotesListPageProps> = ({
  quotes,
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  search,
  status,
  success,
  error,
  user,
}) => {
  const hasFilters = search || status;

  return (
    <Layout title="Devis" currentPath="/backoffice/quotes" user={user}>
      <FlashMessages success={success} error={error} />

      {(user.isSuperAdmin || user.permissions.includes('devis.manage')) && (
        <div class="d-flex justify-content-end mb-3">
          <a href="/backoffice/quotes/new" class="btn btn-primary">
            <i class="bi bi-plus-lg me-2"></i>Nouveau devis
          </a>
        </div>
      )}

      {/* Filters */}
      <div class="card mb-4">
        <div class="card-body">
          <form method="get" class="row g-2 align-items-end">
            <div class="col-md-4">
              <label class="form-label small text-muted">Recherche</label>
              <input
                type="text"
                name="search"
                class="form-control"
                placeholder="Numero, client, email..."
                value={search || ''}
              />
            </div>
            <div class="col-md-3">
              <label class="form-label small text-muted">Statut</label>
              <select name="status" class="form-select">
                <option value="">Tous</option>
                {Object.entries(statusLabels).map(([key, { label }]) => (
                  <option value={key} selected={key === status}>{label}</option>
                ))}
              </select>
            </div>
            <div class="col-auto">
              <button type="submit" class="btn btn-outline-primary">
                <i class="bi bi-search me-1"></i>Filtrer
              </button>
              {hasFilters && (
                <a href="/backoffice/quotes" class="btn btn-outline-secondary ms-2">
                  <i class="bi bi-x-lg"></i>
                </a>
              )}
            </div>
          </form>
        </div>
      </div>

      {/* Table */}
      <div class="card">
        <div class="card-body p-0">
          <Table
            columns={[
              {
                key: 'number',
                label: 'N° devis',
                render: (q: QuoteRow) => (
                  <a href={`/backoffice/quotes/${q.id}`} class="fw-medium text-decoration-none">
                    {q.number}
                  </a>
                ),
              },
              {
                key: 'client',
                label: 'Client / Projet',
                render: (q: QuoteRow) => (
                  <div>
                    <div class="fw-medium">{q.client.firstName} {q.client.lastName}</div>
                    <small class="text-muted">{q.project.name}</small>
                  </div>
                ),
              },
              {
                key: 'status',
                label: 'Statut',
                render: (q: QuoteRow) => {
                  const s = statusLabels[q.status] || { label: q.status, color: 'secondary' };
                  return <span class={`badge bg-${s.color}`}>{s.label}</span>;
                },
              },
              {
                key: 'totalTTC',
                label: 'Total TTC',
                class: 'text-end',
                render: (q: QuoteRow) => (
                  <span class="fw-medium">
                    {q.totalTTC ? `${parseFloat(q.totalTTC).toFixed(2)} EUR` : '-'}
                  </span>
                ),
              },
              {
                key: 'sentAt',
                label: 'Envoye le',
                render: (q: QuoteRow) =>
                  q.sentAt ? (
                    <span class="text-muted">
                      {new Date(q.sentAt).toLocaleDateString('fr-FR')}
                    </span>
                  ) : (
                    <span class="text-muted">-</span>
                  ),
              },
              {
                key: 'createdAt',
                label: 'Cree le',
                render: (q: QuoteRow) =>
                  q.createdAt ? (
                    <span class="text-muted">
                      {new Date(q.createdAt).toLocaleDateString('fr-FR')}
                    </span>
                  ) : (
                    <span class="text-muted">-</span>
                  ),
              },
            ]}
            data={quotes}
            emptyMessage="Aucun devis trouve"
            actions={(q: QuoteRow) => (
              <div class="btn-group btn-group-sm">
                <a
                  href={`/backoffice/quotes/${q.id}`}
                  class="btn btn-outline-primary"
                  title="Voir"
                >
                  <i class="bi bi-eye"></i>
                </a>
                <a
                  href={`/api/devis/${q.id}/pdf`}
                  target="_blank"
                  class="btn btn-outline-secondary"
                  title="Apercu PDF"
                >
                  <i class="bi bi-file-earmark-pdf"></i>
                </a>
              </div>
            )}
          />
        </div>
        {totalPages > 1 && (
          <div class="card-footer d-flex justify-content-between align-items-center">
            <PaginationInfo
              currentPage={currentPage}
              pageSize={pageSize}
              totalItems={totalItems}
            />
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              baseUrl="/backoffice/quotes"
              queryParams={{ search, status }}
            />
          </div>
        )}
      </div>
    </Layout>
  );
};
