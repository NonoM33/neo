import type { FC } from 'hono/jsx';
import { Layout, FlashMessages } from '../../components';
import type { AdminUser } from '../../middleware/admin-auth';
import { ErrorBadge, OnlineDot, StatusBadge, formatDate, type BoxRow } from './shared';

interface SupportEntry {
  id: string;
  status: 'open' | 'closed';
  requestedAt: Date;
  closedAt: Date | null;
  note: string | null;
}

interface BoxDetailPageProps {
  box: BoxRow & { supportRequests: SupportEntry[] };
  success?: string;
  error?: string;
  user: AdminUser;
}

const LINK: Record<string, string> = { up: 'OK', down: 'HORS LIGNE', unknown: '-' };
const HA: Record<string, string> = {
  running: 'OK',
  unresponsive: 'Ne repond pas',
  stopped: 'Arrete',
  unknown: '-',
};

const Row = ({ label, value }: { label: string; value: unknown }) => (
  <tr>
    <th class="text-muted fw-normal" style="width: 40%">{label}</th>
    <td>{value as any}</td>
  </tr>
);

export const BoxDetailPage: FC<BoxDetailPageProps> = ({ box, success, error, user }) => {
  const t = box.telemetry ?? {};
  return (
    <Layout title={`Box …${box.tokenSuffix}`} currentPath="/backoffice/boxes" user={user}>
      <FlashMessages success={success} error={error} />
      <div class="d-flex align-items-center gap-3 mb-3">
        <a href="/backoffice/boxes" class="btn btn-outline-secondary btn-sm">
          <i class="bi bi-arrow-left me-1"></i>Flotte
        </a>
        <h4 class="mb-0 font-monospace">Box …{box.tokenSuffix}</h4>
        <StatusBadge status={box.status} />
        <OnlineDot box={box} />
        <ErrorBadge code={box.errorCode} />
      </div>

      <div class="row g-3">
        <div class="col-lg-6">
          <div class="card h-100">
            <div class="card-header"><i class="bi bi-info-circle me-2"></i>Identite</div>
            <table class="table table-sm mb-0">
              <Row label="Client" value={box.clientName || '-'} />
              <Row label="Identifiant materiel" value={box.hardwareId || '-'} />
              <Row label="Version add-on" value={box.version || '-'} />
              <Row label="Nom d'hote" value={box.hostname || '-'} />
              <Row label="Adresse IP" value={box.ipAddress || '-'} />
              <Row label="Premiere annonce" value={formatDate(box.createdAt)} />
              <Row label="Rattachee le" value={formatDate(box.claimedAt)} />
              <Row label="Enrolee le" value={formatDate(box.enrolledAt)} />
              <Row label="Derniere nouvelle" value={formatDate(box.lastSeenAt)} />
            </table>
          </div>
        </div>
        <div class="col-lg-6">
          <div class="card h-100">
            <div class="card-header"><i class="bi bi-activity me-2"></i>Telemetrie</div>
            <table class="table table-sm mb-0">
              <Row label="Internet" value={LINK[t.internet ?? 'unknown']} />
              <Row label="Cloud Neo" value={LINK[t.cloud ?? 'unknown']} />
              <Row label="Acces distant" value={LINK[t.mesh ?? 'unknown']} />
              <Row label="Home Assistant" value={HA[t.home_assistant ?? 'unknown']} />
              <Row label="Antenne Zigbee" value={LINK[t.zigbee_coordinator ?? 'unknown']} />
              <Row label="Appareils Zigbee" value={t.zigbee_devices ?? 0} />
              <Row label="Disque libre" value={t.disk_free_percent != null ? `${t.disk_free_percent} %` : '-'} />
              <Row label="Temperature CPU" value={t.cpu_temperature_c != null ? `${t.cpu_temperature_c} °C` : '-'} />
            </table>
          </div>
        </div>
      </div>

      <div class="card mt-4">
        <div class="card-header"><i class="bi bi-broadcast-pin me-2"></i>Acces distant (mesh)</div>
        <div class="card-body">
          {box.meshHostname === null ? (
            <p class="text-warning mb-0">
              <i class="bi bi-exclamation-triangle me-1"></i>
              Box rattachee sans mesh (serveur indisponible au rattachement) : pas d'acces distant.
            </p>
          ) : (
            <div class="d-flex flex-wrap align-items-center gap-3">
              <div>
                <div class="text-muted small">Noeud</div>
                <code>{box.meshHostname}</code>
              </div>
              <div>
                <div class="text-muted small">Adresse mesh</div>
                {box.meshIp ? <code>{box.meshIp}</code> : <span class="text-muted">inconnue</span>}
              </div>
              <div>
                <div class="text-muted small">Vue sur le mesh</div>
                {formatDate(box.meshLastSeenAt)}
              </div>
              <form method="post" action={`/backoffice/boxes/${box.id}/support-session`} class="ms-auto">
                <button type="submit" class="btn btn-primary">
                  <i class="bi bi-display me-1"></i>Localiser la box
                </button>
              </form>
              {box.meshIp && (
                <a href={`http://${box.meshIp}:8123`} target="_blank" rel="noopener" class="btn btn-outline-primary">
                  <i class="bi bi-box-arrow-up-right me-1"></i>Ouvrir Home Assistant
                </a>
              )}
            </div>
          )}
          <div class="form-text mt-2">
            Depuis un poste connecte au mesh Neo (Tailscale, utilisateur ops). La box doit etre allumee.
          </div>
        </div>
      </div>

      <div class="card mt-4">
        <div class="card-header"><i class="bi bi-life-preserver me-2"></i>Demandes d'assistance</div>
        {box.supportRequests.length === 0 ? (
          <div class="card-body text-muted">Aucune demande.</div>
        ) : (
          <table class="table table-sm mb-0">
            <thead><tr><th>Demandee le</th><th>Statut</th><th>Cloturee le</th><th>Note</th><th></th></tr></thead>
            <tbody>
              {box.supportRequests.map((r) => (
                <tr>
                  <td>{formatDate(r.requestedAt)}</td>
                  <td>{r.status === 'open' ? <span class="badge text-bg-danger">Ouverte</span> : <span class="badge text-bg-secondary">Cloturee</span>}</td>
                  <td>{formatDate(r.closedAt)}</td>
                  <td>{r.note || '-'}</td>
                  <td>
                    {r.status === 'open' && (
                      <form method="post" action={`/backoffice/boxes/support-requests/${r.id}/close`} class="d-inline">
                        <input type="hidden" name="boxId" value={box.id} />
                        <button type="submit" class="btn btn-sm btn-outline-success">Cloturer</button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {box.status !== 'revoked' && (
        <div class="card mt-4 border-danger">
          <div class="card-body d-flex justify-content-between align-items-center">
            <div>
              <strong>Revoquer cette box</strong>
              <div class="text-muted small">La cle est invalidee : la box ne pourra plus parler au backend. A faire si elle est perdue ou remplacee.</div>
            </div>
            <form method="post" action={`/backoffice/boxes/${box.id}/revoke`} onsubmit="return confirm('Revoquer cette box ?')">
              <button type="submit" class="btn btn-outline-danger">
                <i class="bi bi-x-octagon me-1"></i>Revoquer
              </button>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
};
