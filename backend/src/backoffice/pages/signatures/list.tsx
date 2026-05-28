import type { FC } from 'hono/jsx';
import { Layout, Table, Pagination, PaginationInfo, FlashMessages } from '../../components';
import type { AdminUser } from '../../middleware/admin-auth';

interface SignatureRow {
  id: string;
  quoteId: string;
  quoteNumber: string | null;
  status: string;
  mode: string;
  signerName: string;
  signerEmail: string;
  signingUrl: string | null;
  completedAt: Date | null;
  createdAt: Date;
  clientName: string | null;
  totalTTC: string | null;
}

interface SignaturesListPageProps {
  signatures: SignatureRow[];
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  status?: string;
  mode?: string;
  success?: string;
  error?: string;
  user: AdminUser;
}

const statusLabels: Record<string, { label: string; color: string }> = {
  draft: { label: 'Brouillon', color: 'secondary' },
  pending: { label: 'En attente', color: 'info' },
  signed: { label: 'Signe', color: 'success' },
  declined: { label: 'Refuse', color: 'danger' },
  expired: { label: 'Expire', color: 'warning' },
  cancelled: { label: 'Annule', color: 'secondary' },
};

const modeLabels: Record<string, string> = {
  remote: 'A distance (DocuSeal)',
  direct: 'En personne',
};

export const SignaturesListPage: FC<SignaturesListPageProps> = ({
  signatures,
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  status,
  mode,
  success,
  error,
  user,
}) => {
  const hasFilters = status || mode;

  return (
    <Layout title="Signatures" currentPath="/backoffice/signatures" user={user}>
      <FlashMessages success={success} error={error} />

      {/* Filters */}
      <div class="card mb-4">
        <div class="card-body">
          <form method="get" class="row g-2 align-items-end">
            <div class="col-md-3">
              <label class="form-label small text-muted">Statut</label>
              <select name="status" class="form-select">
                <option value="">Tous</option>
                {Object.entries(statusLabels).map(([key, { label }]) => (
                  <option value={key} selected={key === status}>{label}</option>
                ))}
              </select>
            </div>
            <div class="col-md-3">
              <label class="form-label small text-muted">Mode</label>
              <select name="mode" class="form-select">
                <option value="">Tous</option>
                {Object.entries(modeLabels).map(([key, label]) => (
                  <option value={key} selected={key === mode}>{label}</option>
                ))}
              </select>
            </div>
            <div class="col-auto">
              <button type="submit" class="btn btn-outline-primary">
                <i class="bi bi-search me-1"></i>Filtrer
              </button>
              {hasFilters && (
                <a href="/backoffice/signatures" class="btn btn-outline-secondary ms-2">
                  <i class="bi bi-x-lg"></i>
                </a>
              )}
            </div>
          </form>
        </div>
      </div>

      <div class="card">
        <div class="card-body p-0">
          <Table
            columns={[
              {
                key: 'quote',
                label: 'Devis',
                render: (s: SignatureRow) => (
                  <a
                    href={`/backoffice/quotes/${s.quoteId}`}
                    class="fw-medium text-decoration-none"
                  >
                    {s.quoteNumber ?? s.quoteId.slice(0, 8)}
                  </a>
                ),
              },
              {
                key: 'signer',
                label: 'Signataire',
                render: (s: SignatureRow) => (
                  <div>
                    <div class="fw-medium">{s.signerName}</div>
                    <small class="text-muted">{s.signerEmail}</small>
                  </div>
                ),
              },
              {
                key: 'mode',
                label: 'Mode',
                render: (s: SignatureRow) => (
                  <span class="small">{modeLabels[s.mode] ?? s.mode}</span>
                ),
              },
              {
                key: 'status',
                label: 'Statut',
                render: (s: SignatureRow) => {
                  const st = statusLabels[s.status] ?? { label: s.status, color: 'secondary' };
                  return <span class={`badge bg-${st.color}`}>{st.label}</span>;
                },
              },
              {
                key: 'amount',
                label: 'Montant',
                class: 'text-end',
                render: (s: SignatureRow) =>
                  s.totalTTC ? (
                    <span>{parseFloat(s.totalTTC).toFixed(2)} EUR</span>
                  ) : (
                    <span class="text-muted">-</span>
                  ),
              },
              {
                key: 'date',
                label: 'Date',
                render: (s: SignatureRow) => (
                  <span class="text-muted small">
                    {new Date(s.createdAt).toLocaleDateString('fr-FR')}
                  </span>
                ),
              },
            ]}
            data={signatures}
            emptyMessage="Aucune signature trouvee"
            actions={(s: SignatureRow) => (
              <div class="btn-group btn-group-sm">
                <a
                  href={`/backoffice/quotes/${s.quoteId}`}
                  class="btn btn-outline-primary"
                  title="Voir le devis"
                >
                  <i class="bi bi-eye"></i>
                </a>
                {s.signingUrl && s.status === 'pending' && (
                  <a
                    href={s.signingUrl}
                    target="_blank"
                    class="btn btn-outline-info"
                    title="Ouvrir le lien de signature"
                  >
                    <i class="bi bi-box-arrow-up-right"></i>
                  </a>
                )}
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
              baseUrl="/backoffice/signatures"
              queryParams={{ status, mode }}
            />
          </div>
        )}
      </div>
    </Layout>
  );
};
