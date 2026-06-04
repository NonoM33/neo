import type { FC } from 'hono/jsx';
import { Layout, Table, FlashMessages } from '../../components';
import type { AdminUser } from '../../middleware/admin-auth';
import type { RoleRecord } from '../../../modules/roles/roles.service';

interface RolesListPageProps {
  roles: RoleRecord[];
  success?: string;
  error?: string;
  user: AdminUser;
}

export const RolesListPage: FC<RolesListPageProps> = ({ roles, success, error, user }) => {
  return (
    <Layout title="Rôles & permissions" currentPath="/backoffice/roles" user={user}>
      <FlashMessages success={success} error={error} />

      <div class="card mb-4">
        <div class="card-body">
          <a href="/backoffice/roles/new" class="btn btn-primary">
            <i class="bi bi-plus-lg me-2"></i>Nouveau rôle
          </a>
        </div>
      </div>

      <div class="card">
        <div class="card-body p-0">
          <Table
            columns={[
              {
                key: 'name',
                label: 'Rôle',
                render: (r: RoleRecord) => (
                  <div>
                    <div class="fw-medium">
                      {r.name}
                      {r.isSystem && <span class="badge bg-secondary ms-2">Système</span>}
                    </div>
                    {r.description && <small class="text-muted">{r.description}</small>}
                  </div>
                ),
              },
              {
                key: 'permissions',
                label: 'Permissions',
                render: (r: RoleRecord) => (
                  <span class="badge bg-info">
                    {r.permissions.length} permission{r.permissions.length > 1 ? 's' : ''}
                  </span>
                ),
              },
            ]}
            data={roles}
            emptyMessage="Aucun rôle"
            actions={(r: RoleRecord) => (
              <div class="d-flex gap-2 justify-content-end">
                <a href={`/backoffice/roles/${r.id}/edit`} class="btn btn-sm btn-outline-primary btn-action">
                  <i class="bi bi-pencil"></i>
                </a>
                {!r.isSystem && (
                  <button
                    type="button"
                    class="btn btn-sm btn-outline-danger btn-action"
                    hx-delete={`/backoffice/roles/${r.id}`}
                    hx-target="closest tr"
                    hx-swap="outerHTML"
                    hx-confirm={`Supprimer le rôle ${r.name} ?`}
                  >
                    <i class="bi bi-trash"></i>
                  </button>
                )}
              </div>
            )}
          />
        </div>
      </div>
    </Layout>
  );
};
