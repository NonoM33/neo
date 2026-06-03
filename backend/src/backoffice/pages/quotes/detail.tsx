import type { FC } from 'hono/jsx';
import { Layout, FlashMessages } from '../../components';
import type { AdminUser } from '../../middleware/admin-auth';

interface QuoteDetail {
  id: string;
  number: string;
  status: string;
  totalHT: string | null;
  totalTVA: string | null;
  totalTTC: string | null;
  discount: string | null;
  notes: string | null;
  validUntil: Date | null;
  sentAt: Date | null;
  createdAt: Date | null;
  project: { id: string; name: string; address: string | null };
  client: {
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string | null;
  };
  lines: Array<{
    id: string;
    description: string;
    quantity: number;
    unitPriceHT: string | null;
    tvaRate: string | null;
    totalHT: string | null;
    clientOwned?: boolean | null;
  }>;
  signature?: {
    id: string;
    status: string;
    mode: string;
    signingUrl: string | null;
    signerEmail: string;
    completedAt: Date | null;
  } | null;
}

interface QuoteDetailPageProps {
  quote: QuoteDetail;
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

const signatureStatusLabels: Record<string, { label: string; color: string }> = {
  draft: { label: 'Brouillon', color: 'secondary' },
  pending: { label: 'En attente', color: 'info' },
  signed: { label: 'Signe', color: 'success' },
  declined: { label: 'Refuse', color: 'danger' },
  expired: { label: 'Expire', color: 'warning' },
  cancelled: { label: 'Annule', color: 'secondary' },
};

function fmtEur(v: string | null): string {
  if (!v) return '-';
  return `${parseFloat(v).toFixed(2)} EUR`;
}

export const QuoteDetailPage: FC<QuoteDetailPageProps> = ({
  quote,
  success,
  error,
  user,
}) => {
  const status = statusLabels[quote.status] || { label: quote.status, color: 'secondary' };
  const canResend = quote.status === 'brouillon' || quote.status === 'envoye';

  return (
    <Layout title={`Devis ${quote.number}`} currentPath="/backoffice/quotes" user={user}>
      <FlashMessages success={success} error={error} />

      {/* Header */}
      <div class="d-flex justify-content-between align-items-start mb-4">
        <div>
          <a href="/backoffice/quotes" class="text-muted text-decoration-none small">
            <i class="bi bi-arrow-left me-1"></i>Retour aux devis
          </a>
          <h2 class="mt-2 mb-1">{quote.number}</h2>
          <div class="d-flex align-items-center gap-2">
            <span class={`badge bg-${status.color}`}>{status.label}</span>
            <span class="text-muted small">
              Cree le {quote.createdAt ? new Date(quote.createdAt).toLocaleDateString('fr-FR') : '-'}
            </span>
            {quote.sentAt && (
              <span class="text-muted small">
                · Envoye le {new Date(quote.sentAt).toLocaleDateString('fr-FR')}
              </span>
            )}
          </div>
        </div>
        <div class="btn-group">
          <a
            href={`/backoffice/quotes/${quote.id}/pdf`}
            target="_blank"
            class="btn btn-outline-primary"
          >
            <i class="bi bi-file-earmark-pdf me-1"></i>Apercu PDF
          </a>
          {canResend && (
            <form method="post" action={`/backoffice/quotes/${quote.id}/send`} class="d-inline">
              <button type="submit" class="btn btn-primary">
                <i class="bi bi-envelope me-1"></i>
                {quote.sentAt ? 'Renvoyer' : 'Envoyer'} par email
              </button>
            </form>
          )}
        </div>
      </div>

      <div class="row g-4">
        {/* Client + projet */}
        <div class="col-md-6">
          <div class="card h-100">
            <div class="card-header">
              <strong>Client</strong>
            </div>
            <div class="card-body">
              <h6 class="mb-1">{quote.client.firstName} {quote.client.lastName}</h6>
              {quote.client.email && (
                <div class="text-muted small">
                  <i class="bi bi-envelope me-1"></i>
                  <a href={`mailto:${quote.client.email}`}>{quote.client.email}</a>
                </div>
              )}
              {quote.client.phone && (
                <div class="text-muted small">
                  <i class="bi bi-telephone me-1"></i>
                  <a href={`tel:${quote.client.phone}`}>{quote.client.phone}</a>
                </div>
              )}
              <hr />
              <div class="small text-muted">Projet</div>
              <a href={`/backoffice/projects/${quote.project.id}`} class="text-decoration-none">
                {quote.project.name}
              </a>
              {quote.project.address && (
                <div class="small text-muted">{quote.project.address}</div>
              )}
            </div>
          </div>
        </div>

        {/* Totaux */}
        <div class="col-md-6">
          <div class="card h-100">
            <div class="card-header">
              <strong>Totaux</strong>
            </div>
            <div class="card-body">
              <div class="d-flex justify-content-between mb-1">
                <span class="text-muted">Sous-total HT</span>
                <span>{fmtEur(quote.totalHT)}</span>
              </div>
              {quote.discount && parseFloat(quote.discount) > 0 && (
                <div class="d-flex justify-content-between mb-1">
                  <span class="text-muted">Remise</span>
                  <span class="text-danger">-{parseFloat(quote.discount).toFixed(1)}%</span>
                </div>
              )}
              <div class="d-flex justify-content-between mb-1">
                <span class="text-muted">TVA</span>
                <span>{fmtEur(quote.totalTVA)}</span>
              </div>
              <hr />
              <div class="d-flex justify-content-between">
                <strong>Total TTC</strong>
                <strong class="text-primary fs-5">{fmtEur(quote.totalTTC)}</strong>
              </div>
              {quote.validUntil && (
                <div class="text-muted small mt-3">
                  <i class="bi bi-calendar-event me-1"></i>
                  Valable jusqu'au {new Date(quote.validUntil).toLocaleDateString('fr-FR')}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Signature */}
      {quote.signature && (
        <div class="card mt-4">
          <div class="card-header d-flex justify-content-between align-items-center">
            <strong>Signature electronique</strong>
            {(() => {
              const s = signatureStatusLabels[quote.signature.status] || {
                label: quote.signature.status,
                color: 'secondary',
              };
              return <span class={`badge bg-${s.color}`}>{s.label}</span>;
            })()}
          </div>
          <div class="card-body">
            <div class="row">
              <div class="col-md-6">
                <div class="small text-muted">Mode</div>
                <div>
                  {quote.signature.mode === 'remote' ? 'A distance (DocuSeal)' : 'En personne (tablette)'}
                </div>
              </div>
              <div class="col-md-6">
                <div class="small text-muted">Signataire</div>
                <div>{quote.signature.signerEmail}</div>
              </div>
              {quote.signature.completedAt && (
                <div class="col-md-6 mt-3">
                  <div class="small text-muted">Signe le</div>
                  <div>{new Date(quote.signature.completedAt).toLocaleString('fr-FR')}</div>
                </div>
              )}
              {quote.signature.signingUrl && (
                <div class="col-12 mt-3">
                  <div class="small text-muted">URL de signature</div>
                  <div class="input-group input-group-sm">
                    <input
                      type="text"
                      class="form-control"
                      readonly
                      value={quote.signature.signingUrl}
                    />
                    <a
                      href={quote.signature.signingUrl}
                      target="_blank"
                      class="btn btn-outline-primary"
                    >
                      <i class="bi bi-box-arrow-up-right"></i>
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Lignes */}
      <div class="card mt-4">
        <div class="card-header">
          <strong>Lignes du devis ({quote.lines.length})</strong>
        </div>
        <div class="card-body p-0">
          <table class="table mb-0">
            <thead>
              <tr>
                <th>Designation</th>
                <th class="text-end">Qte</th>
                <th class="text-end">PU HT</th>
                <th class="text-end">TVA</th>
                <th class="text-end">Total HT</th>
              </tr>
            </thead>
            <tbody>
              {quote.lines.map((line) => (
                <tr key={line.id}>
                  <td>
                    {line.description}
                    {line.clientOwned && (
                      <small class="text-muted ms-2">(fourni par le client)</small>
                    )}
                  </td>
                  <td class="text-end">{line.quantity}</td>
                  <td class="text-end">{fmtEur(line.unitPriceHT)}</td>
                  <td class="text-end">{line.tvaRate ? `${parseFloat(line.tvaRate).toFixed(0)}%` : '-'}</td>
                  <td class="text-end fw-medium">
                    {line.clientOwned ? '-' : fmtEur(line.totalHT)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {quote.notes && (
        <div class="card mt-4">
          <div class="card-header">
            <strong>Notes</strong>
          </div>
          <div class="card-body">
            <p class="mb-0" style="white-space: pre-wrap">{quote.notes}</p>
          </div>
        </div>
      )}
    </Layout>
  );
};
