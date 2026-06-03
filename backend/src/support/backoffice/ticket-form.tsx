import type { FC } from 'hono/jsx';
import { Layout, FlashMessages } from '../../backoffice/components';
import type { AdminUser } from '../../backoffice/middleware/admin-auth';

interface Option {
  id: string;
  name: string;
}

interface TicketFormPageProps {
  clients: Option[];
  categories: Option[];
  assignees: Option[];
  preselectedClientId?: string;
  success?: string;
  error?: string;
  user: AdminUser;
}

const priorities: Array<{ value: string; label: string }> = [
  { value: 'basse', label: 'Basse' },
  { value: 'normale', label: 'Normale' },
  { value: 'haute', label: 'Haute' },
  { value: 'urgente', label: 'Urgente' },
  { value: 'critique', label: 'Critique' },
];

export const TicketFormPage: FC<TicketFormPageProps> = ({
  clients,
  categories,
  assignees,
  preselectedClientId,
  success,
  error,
  user,
}) => {
  return (
    <Layout title="Nouveau ticket" currentPath="/backoffice/support/tickets" user={user}>
      <FlashMessages success={success} error={error} />

      <div class="d-flex justify-content-between align-items-center mb-4">
        <h4 class="mb-0">Nouveau ticket</h4>
        <a href="/backoffice/support/tickets" class="btn btn-outline-secondary">
          <i class="bi bi-arrow-left me-1"></i>Retour
        </a>
      </div>

      <form method="post" action="/backoffice/support/tickets">
        <div class="row">
          <div class="col-md-8">
            <div class="card mb-4">
              <div class="card-body">
                <div class="mb-3">
                  <label class="form-label">Titre *</label>
                  <input type="text" name="title" class="form-control" required maxlength={255} />
                </div>
                <div class="mb-0">
                  <label class="form-label">Description *</label>
                  <textarea name="description" class="form-control" rows={6} required></textarea>
                </div>
              </div>
            </div>
          </div>

          <div class="col-md-4">
            <div class="card mb-4">
              <div class="card-body">
                <div class="mb-3">
                  <label class="form-label">Client *</label>
                  <select name="clientId" class="form-select" required>
                    <option value="">Selectionner un client</option>
                    {clients.map((c) => (
                      <option value={c.id} selected={c.id === preselectedClientId}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div class="mb-3">
                  <label class="form-label">Priorite</label>
                  <select name="priority" class="form-select">
                    {priorities.map((p) => (
                      <option value={p.value} selected={p.value === 'normale'}>{p.label}</option>
                    ))}
                  </select>
                </div>
                <div class="mb-3">
                  <label class="form-label">Categorie</label>
                  <select name="categoryId" class="form-select">
                    <option value="">Aucune</option>
                    {categories.map((cat) => (
                      <option value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div class="mb-0">
                  <label class="form-label">Assigner a</label>
                  <select name="assignedToId" class="form-select">
                    <option value="">Auto-assignation</option>
                    {assignees.map((a) => (
                      <option value={a.id}>{a.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <button type="submit" class="btn btn-primary w-100">
              <i class="bi bi-check-lg me-2"></i>Creer le ticket
            </button>
          </div>
        </div>
      </form>
    </Layout>
  );
};
