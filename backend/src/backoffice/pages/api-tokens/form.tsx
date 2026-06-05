import type { FC } from 'hono/jsx';
import { Layout, FlashMessages } from '../../components';
import type { AdminUser } from '../../middleware/admin-auth';

interface RoleOption {
  id: string;
  name: string;
  description: string | null;
}

interface ApiTokenFormPageProps {
  availableRoles: RoleOption[];
  error?: string;
  user: AdminUser;
}

export const ApiTokenFormPage: FC<ApiTokenFormPageProps> = ({
  availableRoles,
  error,
  user,
}) => {
  return (
    <Layout title="Nouveau jeton API" currentPath="/backoffice/api-tokens" user={user}>
      <div class="row">
        <div class="col-lg-8">
          <div class="card">
            <div class="card-header">
              <i class="bi bi-key me-2"></i>Créer un jeton API
            </div>
            <div class="card-body">
              <FlashMessages error={error} />

              <form method="post" action="/backoffice/api-tokens">
                <div class="mb-3">
                  <label class="form-label" for="name">
                    Nom du jeton <span class="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    class="form-control"
                    placeholder="Ex: Accès lecture recette"
                    maxLength={120}
                    required
                  />
                  <div class="form-text">Un libellé pour reconnaître ce jeton dans la liste.</div>
                </div>

                <div class="mb-3">
                  <label class="form-label">
                    Profil (rôles) <span class="text-danger">*</span>
                  </label>
                  <div class="border rounded p-3">
                    {availableRoles.length === 0 ? (
                      <p class="text-muted mb-0">Aucun rôle disponible.</p>
                    ) : (
                      <div class="row g-2">
                        {availableRoles.map((role) => (
                          <div class="col-md-6">
                            <div class="form-check">
                              <input
                                class="form-check-input"
                                type="checkbox"
                                name="roleIds"
                                value={role.id}
                                id={`role-${role.id}`}
                              />
                              <label class="form-check-label" for={`role-${role.id}`}>
                                {role.name}
                                {role.description && (
                                  <span class="text-muted small d-block">{role.description}</span>
                                )}
                              </label>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div class="form-text">
                    Le jeton hérite des permissions des rôles cochés (union). Le rôle « admin »
                    confère un accès complet.
                  </div>
                </div>

                <div class="d-flex gap-2 mt-4 pt-3 border-top">
                  <button type="submit" class="btn btn-primary">
                    <i class="bi bi-check-lg me-2"></i>Créer le jeton
                  </button>
                  <a href="/backoffice/api-tokens" class="btn btn-outline-secondary">
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
