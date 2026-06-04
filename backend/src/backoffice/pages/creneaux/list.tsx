import type { FC } from 'hono/jsx';
import { Layout, FlashMessages } from '../../components';
import type { AdminUser } from '../../middleware/admin-auth';
import { dayOfWeekValues } from '../../../modules/appointments/appointments.schema';

interface UserOption {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface SlotRow {
  dayOfWeek: string;
  startTime: string;
  endTime: string;
}

interface CreneauxPageProps {
  users: UserOption[];
  selectedUserId?: string;
  slots: SlotRow[];
  success?: string;
  error?: string;
  user: AdminUser;
}

const dayLabels: Record<string, string> = {
  lundi: 'Lundi',
  mardi: 'Mardi',
  mercredi: 'Mercredi',
  jeudi: 'Jeudi',
  vendredi: 'Vendredi',
  samedi: 'Samedi',
  dimanche: 'Dimanche',
};

export const CreneauxPage: FC<CreneauxPageProps> = ({
  users,
  selectedUserId,
  slots,
  success,
  error,
  user,
}) => {
  // Always show at least one empty editable row so a fresh user can be filled.
  const rows = slots.length > 0 ? slots : [{ dayOfWeek: 'lundi', startTime: '09:00', endTime: '18:00' }];

  return (
    <Layout title="Créneaux de disponibilité" currentPath="/backoffice/creneaux" user={user}>
      <FlashMessages success={success} error={error} />

      <div class="card mb-4">
        <div class="card-body">
          <form method="get" class="row g-2 align-items-end">
            <div class="col-md-5">
              <label class="form-label small text-muted">Collaborateur</label>
              <select name="userId" class="form-select" onchange="this.form.submit()">
                <option value="">Sélectionner un collaborateur…</option>
                {users.map((u) => (
                  <option value={u.id} selected={u.id === selectedUserId}>
                    {u.firstName} {u.lastName} ({u.email})
                  </option>
                ))}
              </select>
            </div>
          </form>
        </div>
      </div>

      {selectedUserId && (
        <div class="card">
          <div class="card-header d-flex justify-content-between align-items-center">
            <span><i class="bi bi-clock-history me-2"></i>Créneaux hebdomadaires</span>
            <button type="button" class="btn btn-sm btn-outline-primary" id="add-slot-row">
              <i class="bi bi-plus-lg me-1"></i>Ajouter un créneau
            </button>
          </div>
          <div class="card-body">
            <form method="post" action="/backoffice/creneaux">
              <input type="hidden" name="userId" value={selectedUserId} />
              <div id="slot-rows">
                {rows.map((row) => (
                  <div class="row g-2 align-items-end mb-2 slot-row">
                    <div class="col-md-4">
                      <label class="form-label small text-muted">Jour</label>
                      <select name="day" class="form-select">
                        {dayOfWeekValues.map((d) => (
                          <option value={d} selected={d === row.dayOfWeek}>{dayLabels[d]}</option>
                        ))}
                      </select>
                    </div>
                    <div class="col-md-3">
                      <label class="form-label small text-muted">Début</label>
                      <input type="time" name="start" class="form-control" value={row.startTime} />
                    </div>
                    <div class="col-md-3">
                      <label class="form-label small text-muted">Fin</label>
                      <input type="time" name="end" class="form-control" value={row.endTime} />
                    </div>
                    <div class="col-md-2">
                      <button type="button" class="btn btn-outline-danger w-100 remove-slot-row">
                        <i class="bi bi-trash"></i>
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div class="d-flex gap-2 mt-4 pt-3 border-top">
                <button type="submit" class="btn btn-primary">
                  <i class="bi bi-check-lg me-2"></i>Enregistrer les créneaux
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <script
        dangerouslySetInnerHTML={{
          __html: `
            (function () {
              const container = document.getElementById('slot-rows');
              const addBtn = document.getElementById('add-slot-row');
              if (!container || !addBtn) return;
              function bindRemove(row) {
                const btn = row.querySelector('.remove-slot-row');
                if (btn) btn.addEventListener('click', function () {
                  if (container.querySelectorAll('.slot-row').length > 1) row.remove();
                });
              }
              container.querySelectorAll('.slot-row').forEach(bindRemove);
              addBtn.addEventListener('click', function () {
                const rows = container.querySelectorAll('.slot-row');
                const clone = rows[rows.length - 1].cloneNode(true);
                container.appendChild(clone);
                bindRemove(clone);
              });
            })();
          `,
        }}
      />
    </Layout>
  );
};
