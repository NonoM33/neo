import type { FC } from 'hono/jsx';
import { Layout, Table, FlashMessages } from '../../components';
import type { AdminUser } from '../../middleware/admin-auth';

interface TokenRow {
  id: string;
  name: string;
  tokenPrefix: string;
  roleNames: string[];
  createdByEmail: string | null;
  lastUsedAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
}

interface ApiTokensListPageProps {
  tokens: TokenRow[];
  // Secret en clair affiché une seule fois, juste après création.
  createdToken?: { name: string; raw: string };
  success?: string;
  error?: string;
  user: AdminUser;
}

export const ApiTokensListPage: FC<ApiTokensListPageProps> = ({
  tokens,
  createdToken,
  success,
  error,
  user,
}) => {
  return (
    <Layout title="Jetons API" currentPath="/backoffice/api-tokens" user={user}>
      <FlashMessages success={success} error={error} />

      {createdToken && (
        <div class="alert alert-success border-0 shadow-sm">
          <h5 class="alert-heading">
            <i class="bi bi-key me-2"></i>Jeton « {createdToken.name} » créé
          </h5>
          <p class="mb-2">
            Copiez-le maintenant : il ne sera <strong>plus jamais affiché</strong>.
          </p>
          <div class="input-group">
            <input
              type="text"
              class="form-control font-monospace"
              id="new-token-value"
              value={createdToken.raw}
              readonly
            />
            <button
              class="btn btn-outline-secondary"
              type="button"
              onclick="navigator.clipboard.writeText(document.getElementById('new-token-value').value)"
            >
              <i class="bi bi-clipboard me-1"></i>Copier
            </button>
          </div>
        </div>
      )}

      <div class="card mb-4">
        <div class="card-body">
          <a href="/backoffice/api-tokens/new" class="btn btn-primary">
            <i class="bi bi-plus-lg me-2"></i>Nouveau jeton
          </a>
          <span class="text-muted small ms-3">
            Les jetons donnent un accès programmatique à l'API, scopé selon les rôles cochés.
          </span>
        </div>
      </div>

      <div class="card">
        <div class="card-body p-0">
          <Table
            columns={[
              {
                key: 'name',
                label: 'Nom',
                render: (t: TokenRow) => (
                  <div>
                    <div class="fw-medium">{t.name}</div>
                    <code class="text-muted small">{t.tokenPrefix}…</code>
                  </div>
                ),
              },
              {
                key: 'roleNames',
                label: 'Profil',
                render: (t: TokenRow) =>
                  t.roleNames.length > 0 ? (
                    <span>
                      {t.roleNames.map((name) => (
                        <span class="badge bg-secondary me-1">{name}</span>
                      ))}
                    </span>
                  ) : (
                    <span class="text-muted">Aucun rôle</span>
                  ),
              },
              {
                key: 'createdByEmail',
                label: 'Créé par',
                render: (t: TokenRow) => t.createdByEmail || '-',
              },
              {
                key: 'lastUsedAt',
                label: 'Dernière utilisation',
                render: (t: TokenRow) =>
                  t.lastUsedAt
                    ? new Date(t.lastUsedAt).toLocaleString('fr-FR')
                    : 'Jamais',
              },
              {
                key: 'revokedAt',
                label: 'Statut',
                render: (t: TokenRow) =>
                  t.revokedAt ? (
                    <span class="badge bg-danger">Révoqué</span>
                  ) : (
                    <span class="badge bg-success">Actif</span>
                  ),
              },
            ]}
            data={tokens}
            emptyMessage="Aucun jeton API"
            actions={(t: TokenRow) =>
              t.revokedAt ? (
                <span class="text-muted small">—</span>
              ) : (
                <button
                  class="btn btn-sm btn-outline-danger btn-action"
                  title="Révoquer"
                  hx-post={`/backoffice/api-tokens/${t.id}/revoke`}
                  hx-confirm={`Révoquer le jeton « ${t.name} » ? Cette action est irréversible.`}
                  hx-target={`#row-${t.id}`}
                  hx-swap="outerHTML"
                >
                  <i class="bi bi-slash-circle me-1"></i>Révoquer
                </button>
              )
            }
          />
        </div>
      </div>
    </Layout>
  );
};
