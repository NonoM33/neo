import type { FC } from 'hono/jsx';
import { Layout, Table, FlashMessages } from '../../components';
import type { AdminUser } from '../../middleware/admin-auth';
import {
  ErrorBadge,
  OnlineDot,
  StatusBadge,
  formatDate,
  type BoxRow,
  type SupportRequestRow,
} from './shared';

interface ClientOption {
  id: string;
  firstName: string;
  lastName: string;
}

interface BoxStats {
  total: number;
  unclaimed: number;
  enrolled: number;
  online: number;
  openSupportRequests: number;
}

interface BoxesListPageProps {
  boxes: BoxRow[];
  stats: BoxStats;
  clients: ClientOption[];
  openRequests: SupportRequestRow[];
  success?: string;
  error?: string;
  user: AdminUser;
}

const Stat = ({ label, value, tone }: { label: string; value: number; tone?: string }) => (
  <div class="col-6 col-lg-3">
    <div class="card h-100">
      <div class="card-body">
        <div class="text-muted small">{label}</div>
        <div class={`fs-3 fw-bold ${tone ? `text-${tone}` : ''}`}>{value}</div>
      </div>
    </div>
  </div>
);

export const BoxesListPage: FC<BoxesListPageProps> = ({
  boxes,
  stats,
  clients,
  openRequests,
  success,
  error,
  user,
}) => (
  <Layout title="Box domotiques" currentPath="/backoffice/boxes" user={user}>
    <FlashMessages success={success} error={error} />

    <div class="row g-3 mb-4">
      <Stat label="Box connues" value={stats.total} />
      <Stat label="En ligne" value={stats.online} tone="success" />
      <Stat label="Non rattachees" value={stats.unclaimed} tone={stats.unclaimed ? 'warning' : undefined} />
      <Stat label="Demandes d'assistance" value={stats.openSupportRequests} tone={stats.openSupportRequests ? 'danger' : undefined} />
    </div>

    {openRequests.length > 0 && (
      <div class="card mb-4 border-danger">
        <div class="card-header text-danger">
          <i class="bi bi-life-preserver me-2"></i>Assistance a distance demandee depuis la box
        </div>
        <Table
          columns={[
            { key: 'requestedAt', label: 'Demandee le', render: (r: SupportRequestRow) => formatDate(r.requestedAt) },
            { key: 'client', label: 'Client', render: (r: SupportRequestRow) => r.clientName || '-' },
            { key: 'box', label: 'Box', render: (r: SupportRequestRow) => <a href={`/backoffice/boxes/${r.box.id}`}>…{r.box.tokenSuffix}</a> },
            { key: 'error', label: 'Erreur', render: (r: SupportRequestRow) => <ErrorBadge code={r.box.errorCode} /> },
          ]}
          data={openRequests}
          actions={(r: SupportRequestRow) => (
            <form method="post" action={`/backoffice/boxes/support-requests/${r.id}/close`} class="d-inline">
              <button type="submit" class="btn btn-sm btn-outline-success">
                <i class="bi bi-check2 me-1"></i>Cloturer
              </button>
            </form>
          )}
        />
      </div>
    )}

    <div class="card mb-4">
      <div class="card-header">
        <i class="bi bi-qr-code-scan me-2"></i>Rattacher une box a un client
      </div>
      <div class="card-body">
        <form method="post" action="/backoffice/boxes/claim" class="row g-3 align-items-end">
          <div class="col-md-5">
            <label class="form-label" for="provisioning_token">Code affiche sur la box</label>
            <input
              type="text"
              id="provisioning_token"
              name="provisioning_token"
              class="form-control font-monospace"
              placeholder="ABCD-EFGH-JKMN-PQRS-TVWX"
              required
            />
            <div class="form-text">La box doit etre allumee et connectee : elle s'annonce toute seule.</div>
          </div>
          <div class="col-md-5">
            <label class="form-label" for="client_id">Client</label>
            <select id="client_id" name="client_id" class="form-select" required>
              <option value="">Choisir…</option>
              {clients.map((c) => (
                <option value={c.id}>{c.lastName} {c.firstName}</option>
              ))}
            </select>
          </div>
          <div class="col-md-2">
            <button type="submit" class="btn btn-primary w-100">
              <i class="bi bi-link-45deg me-1"></i>Rattacher
            </button>
          </div>
        </form>
      </div>
    </div>

    <div class="card">
      <div class="card-header"><i class="bi bi-router me-2"></i>Flotte</div>
      <Table
        columns={[
          { key: 'tokenSuffix', label: 'Box', render: (b: BoxRow) => <a href={`/backoffice/boxes/${b.id}`} class="font-monospace">…{b.tokenSuffix}</a> },
          { key: 'clientName', label: 'Client', render: (b: BoxRow) => b.clientName || <span class="text-muted">-</span> },
          { key: 'status', label: 'Statut', render: (b: BoxRow) => <StatusBadge status={b.status} /> },
          { key: 'online', label: 'Presence', render: (b: BoxRow) => <OnlineDot box={b} /> },
          { key: 'errorCode', label: 'Etat', render: (b: BoxRow) => <ErrorBadge code={b.errorCode} /> },
          { key: 'zigbeeDevices', label: 'Zigbee', render: (b: BoxRow) => `${b.zigbeeDevices ?? 0} app.` },
          { key: 'version', label: 'Version' },
          { key: 'ipAddress', label: 'IP' },
          { key: 'lastSeenAt', label: 'Vue le', render: (b: BoxRow) => formatDate(b.lastSeenAt) },
        ]}
        data={boxes}
        emptyMessage="Aucune box ne s'est encore annoncee."
      />
    </div>
  </Layout>
);
