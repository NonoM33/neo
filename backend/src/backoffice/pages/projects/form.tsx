import type { FC } from 'hono/jsx';
import { Layout, FlashMessages } from '../../components';
import type { AdminUser } from '../../middleware/admin-auth';

interface ClientOption {
  id: string;
  firstName: string;
  lastName: string;
}

interface UserOption {
  id: string;
  firstName: string;
  lastName: string;
}

export interface ProjectFormValues {
  clientId?: string;
  userId?: string;
  name?: string;
  description?: string;
  status?: string;
  address?: string;
  postalCode?: string;
  city?: string;
  surface?: string;
  roomCount?: string;
}

interface ProjectFormPageProps {
  clients: ClientOption[];
  integrateurs: UserOption[];
  /** Client pre-selectionne quand on arrive depuis une fiche client. */
  preselectedClientId?: string;
  /** Valeurs a reafficher apres une erreur de validation. */
  values?: ProjectFormValues;
  /** Projet en cours de modification. Absent = creation. */
  editing?: { id: string };
  error?: string;
  user: AdminUser;
}

const STATUSES: { value: string; label: string }[] = [
  { value: 'brouillon', label: 'Brouillon' },
  { value: 'en_cours', label: 'En cours' },
  { value: 'termine', label: 'Termine' },
  { value: 'archive', label: 'Archive' },
];

export const ProjectFormPage: FC<ProjectFormPageProps> = ({
  clients,
  integrateurs,
  preselectedClientId,
  values = {},
  editing,
  error,
  user,
}) => {
  const selectedClientId = values.clientId || preselectedClientId || '';
  const selectedUserId = values.userId || user.id;
  const selectedStatus = values.status || 'brouillon';
  const cancelHref = editing
    ? `/backoffice/projects/${editing.id}`
    : selectedClientId
      ? `/backoffice/clients/${selectedClientId}`
      : '/backoffice/projects';
  const title = editing ? 'Modifier le projet' : 'Nouveau projet';

  return (
    <Layout title={title} currentPath="/backoffice/projects" user={user}>
      <div class="row g-4">
        <div class="col-lg-8">
          <div class="card">
            <div class="card-header">
              <i class={`bi ${editing ? 'bi-pencil-square' : 'bi-folder-plus'} me-2`}></i>
              {editing ? 'Modification du projet' : 'Creer un nouveau projet'}
            </div>
            <div class="card-body">
              <FlashMessages error={error} />

              <form method="post" action={editing ? `/backoffice/projects/${editing.id}` : '/backoffice/projects'}>
                <div class="row g-3">
                  <div class="col-md-6">
                    <label class="form-label" for="clientId">
                      Client <span class="text-danger">*</span>
                    </label>
                    <select id="clientId" name="clientId" class="form-select" required>
                      <option value="">-- Choisir un client --</option>
                      {clients.map((client) => (
                        <option value={client.id} selected={client.id === selectedClientId}>
                          {client.lastName} {client.firstName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div class="col-md-6">
                    <label class="form-label" for="name">
                      Nom du projet <span class="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      class="form-control"
                      value={values.name || ''}
                      placeholder="Installation domotique"
                      required
                    />
                  </div>

                  <div class="col-md-6">
                    <label class="form-label" for="userId">
                      Integrateur en charge <span class="text-danger">*</span>
                    </label>
                    <select id="userId" name="userId" class="form-select" required>
                      {integrateurs.map((integrateur) => (
                        <option value={integrateur.id} selected={integrateur.id === selectedUserId}>
                          {integrateur.firstName} {integrateur.lastName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div class="col-md-6">
                    <label class="form-label" for="status">Statut</label>
                    <select id="status" name="status" class="form-select">
                      {STATUSES.map((status) => (
                        <option value={status.value} selected={status.value === selectedStatus}>
                          {status.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div class="col-12">
                    <label class="form-label" for="description">Description</label>
                    <textarea id="description" name="description" class="form-control" rows={3}>{values.description || ''}</textarea>
                  </div>

                  <div class="col-12">
                    <hr class="my-2" />
                    <h6 class="text-muted mb-3">
                      <i class="bi bi-geo-alt me-2"></i>Chantier
                    </h6>
                  </div>

                  <div class="col-12">
                    <label class="form-label" for="address">Adresse</label>
                    <input type="text" id="address" name="address" class="form-control" value={values.address || ''} />
                  </div>

                  <div class="col-md-4">
                    <label class="form-label" for="postalCode">Code postal</label>
                    <input type="text" id="postalCode" name="postalCode" class="form-control" value={values.postalCode || ''} />
                  </div>

                  <div class="col-md-8">
                    <label class="form-label" for="city">Ville</label>
                    <input type="text" id="city" name="city" class="form-control" value={values.city || ''} />
                  </div>

                  <div class="col-md-6">
                    <label class="form-label" for="surface">Surface (m2)</label>
                    <input type="number" step="0.01" min="0" id="surface" name="surface" class="form-control" value={values.surface || ''} />
                  </div>

                  <div class="col-md-6">
                    <label class="form-label" for="roomCount">Nombre de pieces</label>
                    <input type="number" min="1" id="roomCount" name="roomCount" class="form-control" value={values.roomCount || ''} />
                  </div>
                </div>

                <div class="d-flex gap-2 mt-4 pt-3 border-top">
                  <button type="submit" class="btn btn-primary">
                    <i class="bi bi-check-lg me-2"></i>
                    {editing ? 'Enregistrer' : 'Creer le projet'}
                  </button>
                  <a href={cancelHref} class="btn btn-outline-secondary">
                    <i class="bi bi-x-lg me-2"></i>Annuler
                  </a>
                </div>
              </form>
            </div>
          </div>
        </div>

        <div class="col-lg-4">
          <div class="card">
            <div class="card-header">
              <i class="bi bi-info-circle me-2"></i>A savoir
            </div>
            <div class="card-body small text-muted">
              <p class="mb-2">
                Un devis est toujours rattache a un projet : creez le projet ici, puis ajoutez
                les devis depuis sa fiche ou depuis la fiche client.
              </p>
              <p class="mb-0">
                L'integrateur en charge verra le projet dans son application mobile.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};
