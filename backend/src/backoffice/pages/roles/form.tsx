import type { FC } from 'hono/jsx';
import { Layout, FlashMessages } from '../../components';
import type { AdminUser } from '../../middleware/admin-auth';
import { groupedPermissions } from '../../../modules/roles/permissions';

interface RoleData {
  id: string;
  name: string;
  description: string | null;
  permissions: string[];
  isSystem: boolean;
}

interface RoleFormPageProps {
  roleData?: RoleData;
  error?: string;
  user: AdminUser;
}

export const RoleFormPage: FC<RoleFormPageProps> = ({ roleData, error, user }) => {
  const isEdit = !!roleData;
  const checked = new Set(roleData?.permissions ?? []);
  const isSystem = roleData?.isSystem ?? false;
  const title = isEdit ? 'Modifier le rôle' : 'Nouveau rôle';
  const groups = groupedPermissions();

  return (
    <Layout title={title} currentPath="/backoffice/roles" user={user}>
      <div class="row">
        <div class="col-lg-9">
          <div class="card">
            <div class="card-header">
              <i class="bi bi-shield-lock me-2"></i>
              {isEdit ? `Modification de ${roleData?.name}` : 'Créer un nouveau rôle'}
            </div>
            <div class="card-body">
              <FlashMessages error={error} />

              <form method="post" action={isEdit ? `/backoffice/roles/${roleData?.id}` : '/backoffice/roles'}>
                <div class="row g-3">
                  <div class="col-md-5">
                    <label class="form-label" for="name">
                      Nom du rôle <span class="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      class="form-control"
                      value={roleData?.name || ''}
                      maxLength={50}
                      required
                      readOnly={isSystem}
                    />
                    {isSystem && (
                      <div class="form-text">Le nom d'un rôle système ne peut pas être modifié.</div>
                    )}
                  </div>
                  <div class="col-md-7">
                    <label class="form-label" for="description">Description</label>
                    <input
                      type="text"
                      id="description"
                      name="description"
                      class="form-control"
                      value={roleData?.description || ''}
                      maxLength={255}
                    />
                  </div>
                </div>

                <hr class="my-4" />

                <h6 class="mb-3">
                  <i class="bi bi-check2-square me-2"></i>Permissions
                </h6>
                <div class="row g-3">
                  {groups.map((group) => (
                    <div class="col-md-6">
                      <div class="border rounded p-3 h-100">
                        <div class="fw-semibold text-uppercase small text-muted mb-2">{group.group}</div>
                        {group.permissions.map((perm) => (
                          <div class="form-check">
                            <input
                              class="form-check-input"
                              type="checkbox"
                              name="permissions"
                              value={perm.key}
                              id={`perm-${perm.key}`}
                              checked={checked.has(perm.key)}
                            />
                            <label class="form-check-label" for={`perm-${perm.key}`}>
                              {perm.label}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <div class="d-flex gap-2 mt-4 pt-3 border-top">
                  <button type="submit" class="btn btn-primary">
                    <i class="bi bi-check-lg me-2"></i>
                    {isEdit ? 'Enregistrer' : 'Créer'}
                  </button>
                  <a href="/backoffice/roles" class="btn btn-outline-secondary">
                    <i class="bi bi-x-lg me-2"></i>Annuler
                  </a>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};
