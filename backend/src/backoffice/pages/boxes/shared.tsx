import type { BoxTelemetry } from '../../../db/schema/boxes';

export type BoxStatus = 'unclaimed' | 'claimed' | 'enrolled' | 'revoked';

// Vue d'une box telle que la rend le service (jamais d'empreinte ni de cle).
export interface BoxRow {
  id: string;
  tokenSuffix: string;
  hardwareId: string | null;
  status: BoxStatus;
  clientId: string | null;
  clientName?: string | null;
  version: string | null;
  errorCode: string | null;
  telemetry: BoxTelemetry | null;
  ipAddress: string | null;
  hostname: string | null;
  zigbeeDevices: number | null;
  lastSeenAt: Date | null;
  claimedAt: Date | null;
  enrolledAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
  isOnline: boolean;
}

export interface SupportRequestRow {
  id: string;
  boxId: string;
  status: 'open' | 'closed';
  note: string | null;
  requestedAt: Date;
  closedAt: Date | null;
  box: BoxRow;
  clientName?: string | null;
}

export const STATUS_LABEL: Record<BoxStatus, { label: string; tone: string }> = {
  unclaimed: { label: 'Non rattachee', tone: 'secondary' },
  claimed: { label: 'Rattachee, cle en attente', tone: 'info' },
  enrolled: { label: 'Enrolee', tone: 'success' },
  revoked: { label: 'Revoquee', tone: 'danger' },
};

export function formatDate(d: Date | null | undefined): string {
  if (!d) return '-';
  return new Date(d).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
}

export const StatusBadge = ({ status }: { status: BoxStatus }) => {
  const { label, tone } = STATUS_LABEL[status];
  return <span class={`badge text-bg-${tone}`}>{label}</span>;
};

export const OnlineDot = ({ box }: { box: BoxRow }) => {
  if (box.status !== 'enrolled') return <span class="text-muted">-</span>;
  return box.isOnline ? (
    <span class="text-success"><i class="bi bi-circle-fill me-1"></i>En ligne</span>
  ) : (
    <span class="text-danger"><i class="bi bi-circle-fill me-1"></i>Hors ligne</span>
  );
};

export const ErrorBadge = ({ code }: { code: string | null }) =>
  code ? <span class="badge text-bg-danger font-monospace">{code}</span> : <span class="text-success">OK</span>;
