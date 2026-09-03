import { and, count, desc, eq, ilike, or, sql, type SQL } from 'drizzle-orm';
import { db } from '../../config/database';
import { boxSupportRequests, boxes, clients } from '../../db/schema';
import type { Box } from '../../db/schema/boxes';
import { ConflictError, NotFoundError } from '../../lib/errors';
import { getOffset, paginate, type PaginationParams } from '../../lib/pagination';
import {
  generateBoxApiKey,
  hashSecret,
  isBoxOnline,
  normalizeProvisioningToken,
  resolveAnnounce,
  tokenSuffix,
} from './boxes.domain';
import type {
  AnnounceInput,
  BoxFilter,
  BoxHeartbeatInput,
  ClaimInput,
  SupportFilter,
} from './boxes.schema';

const clientName = sql<string>`${clients.firstName} || ' ' || ${clients.lastName}`;

// ----- Lookups -----

export async function findBoxByApiKeyHash(hash: string): Promise<Box | null> {
  const [box] = await db.select().from(boxes).where(eq(boxes.apiKeyHash, hash)).limit(1);
  return box ?? null;
}

async function findBoxByTokenHash(hash: string): Promise<Box | null> {
  const [box] = await db
    .select()
    .from(boxes)
    .where(eq(boxes.provisioningTokenHash, hash))
    .limit(1);
  return box ?? null;
}

// ----- Cycle de vie : annonce (box) puis claim (installateur) -----

export async function announceBox(input: AnnounceInput) {
  const token = normalizeProvisioningToken(input.provisioning_token);
  const tokenHash = hashSecret(token);
  const box = await findBoxByTokenHash(tokenHash);
  const outcome = resolveAnnounce(box);

  if (outcome.kind === 'register') {
    await db.insert(boxes).values({
      provisioningTokenHash: tokenHash,
      tokenSuffix: tokenSuffix(token),
      hardwareId: input.hardware_id,
      version: input.version,
      lastSeenAt: new Date(),
    });
    return { status: 'unclaimed' as const };
  }

  await db
    .update(boxes)
    .set({ lastSeenAt: new Date(), version: input.version ?? box!.version, updatedAt: new Date() })
    .where(eq(boxes.id, box!.id));

  if (outcome.kind === 'deliver') {
    // Livraison unique : la cle en clair disparait de la base avec cette reponse.
    await db
      .update(boxes)
      .set({ status: 'enrolled', apiKeyPending: null, enrolledAt: new Date() })
      .where(eq(boxes.id, box!.id));
    return { status: 'claimed' as const, box_id: box!.id, api_key: outcome.apiKey };
  }

  return { status: outcome.status };
}

export async function claimBox(input: ClaimInput, claimedBy: string) {
  const token = normalizeProvisioningToken(input.provisioning_token);
  const box = await findBoxByTokenHash(hashSecret(token));
  if (!box) {
    throw new NotFoundError('Box (elle doit etre allumee et connectee a Internet)');
  }
  if (box.status !== 'unclaimed') {
    throw new ConflictError('Cette box est deja rattachee a un client');
  }
  const [client] = await db
    .select({ id: clients.id })
    .from(clients)
    .where(eq(clients.id, input.client_id))
    .limit(1);
  if (!client) {
    throw new NotFoundError('Client');
  }
  const apiKey = generateBoxApiKey();
  const [updated] = await db
    .update(boxes)
    .set({
      status: 'claimed',
      clientId: input.client_id,
      apiKeyHash: hashSecret(apiKey),
      apiKeyPending: apiKey,
      claimedAt: new Date(),
      claimedBy,
      updatedAt: new Date(),
    })
    .where(eq(boxes.id, box.id))
    .returning();
  return toPublic(updated!);
}

export async function revokeBox(id: string) {
  const [box] = await db
    .update(boxes)
    .set({ status: 'revoked', apiKeyPending: null, revokedAt: new Date(), updatedAt: new Date() })
    .where(eq(boxes.id, id))
    .returning();
  if (!box) throw new NotFoundError('Box');
  return toPublic(box);
}

// ----- Telemetrie (box authentifiee) -----

export async function recordHeartbeat(box: Box, input: BoxHeartbeatInput) {
  await db
    .update(boxes)
    .set({
      lastSeenAt: new Date(),
      version: input.version ?? box.version,
      errorCode: input.error_code ?? null,
      telemetry: input.state,
      ipAddress: input.state.ip_address ?? null,
      hostname: input.state.hostname ?? box.hostname,
      zigbeeDevices: input.state.zigbee_devices ?? box.zigbeeDevices,
      updatedAt: new Date(),
    })
    .where(eq(boxes.id, box.id));
  return { status: 'ok' as const };
}

export async function requestSupport(box: Box) {
  const [open] = await db
    .select()
    .from(boxSupportRequests)
    .where(and(eq(boxSupportRequests.boxId, box.id), eq(boxSupportRequests.status, 'open')))
    .limit(1);
  if (open) return { id: open.id, status: 'open' as const, already_open: true };
  const [created] = await db.insert(boxSupportRequests).values({ boxId: box.id }).returning();
  return { id: created!.id, status: 'open' as const, already_open: false };
}

// ----- Administration -----

export async function listBoxes(params: PaginationParams, filters: BoxFilter) {
  const conditions: SQL[] = [];
  if (filters.status) conditions.push(eq(boxes.status, filters.status));
  if (filters.clientId) conditions.push(eq(boxes.clientId, filters.clientId));
  if (filters.search) {
    const term = `%${filters.search}%`;
    conditions.push(
      or(
        ilike(boxes.hostname, term),
        ilike(boxes.tokenSuffix, term),
        ilike(clients.firstName, term),
        ilike(clients.lastName, term),
      )!,
    );
  }
  const where = conditions.length ? and(...conditions) : undefined;
  const rows = await db
    .select({ box: boxes, clientName })
    .from(boxes)
    .leftJoin(clients, eq(boxes.clientId, clients.id))
    .where(where)
    .orderBy(desc(boxes.createdAt))
    .limit(params.limit)
    .offset(getOffset(params));
  const [total] = await db
    .select({ count: count() })
    .from(boxes)
    .leftJoin(clients, eq(boxes.clientId, clients.id))
    .where(where);
  return paginate(
    rows.map((r) => ({ ...toPublic(r.box), clientName: r.clientName })),
    total?.count ?? 0,
    params,
  );
}

export async function getBox(id: string) {
  const [row] = await db
    .select({ box: boxes, clientName })
    .from(boxes)
    .leftJoin(clients, eq(boxes.clientId, clients.id))
    .where(eq(boxes.id, id))
    .limit(1);
  if (!row) throw new NotFoundError('Box');
  const requests = await db
    .select()
    .from(boxSupportRequests)
    .where(eq(boxSupportRequests.boxId, id))
    .orderBy(desc(boxSupportRequests.requestedAt))
    .limit(20);
  return { ...toPublic(row.box), clientName: row.clientName, supportRequests: requests };
}

export async function listSupportRequests(filters: SupportFilter) {
  const where = filters.status ? eq(boxSupportRequests.status, filters.status) : undefined;
  const rows = await db
    .select({ request: boxSupportRequests, box: boxes, clientName })
    .from(boxSupportRequests)
    .innerJoin(boxes, eq(boxSupportRequests.boxId, boxes.id))
    .leftJoin(clients, eq(boxes.clientId, clients.id))
    .where(where)
    .orderBy(desc(boxSupportRequests.requestedAt))
    .limit(100);
  return rows.map((r) => ({ ...r.request, box: toPublic(r.box), clientName: r.clientName }));
}

export async function closeSupportRequest(id: string, closedBy: string, note?: string) {
  const [updated] = await db
    .update(boxSupportRequests)
    .set({ status: 'closed', closedAt: new Date(), closedBy, note: note ?? null })
    .where(eq(boxSupportRequests.id, id))
    .returning();
  if (!updated) throw new NotFoundError('Demande d\'assistance');
  return updated;
}

export async function getBoxStats() {
  const rows = await db.select({ status: boxes.status, lastSeenAt: boxes.lastSeenAt }).from(boxes);
  const [openSupport] = await db
    .select({ count: count() })
    .from(boxSupportRequests)
    .where(eq(boxSupportRequests.status, 'open'));
  return {
    total: rows.length,
    unclaimed: rows.filter((r) => r.status === 'unclaimed').length,
    enrolled: rows.filter((r) => r.status === 'enrolled').length,
    online: rows.filter((r) => r.status === 'enrolled' && isBoxOnline(r.lastSeenAt)).length,
    openSupportRequests: openSupport?.count ?? 0,
  };
}

// Jamais d'empreinte ni de cle en clair hors de la base.
function toPublic(box: Box) {
  const { provisioningTokenHash, apiKeyHash, apiKeyPending, ...rest } = box;
  void provisioningTokenHash;
  void apiKeyHash;
  void apiKeyPending;
  return { ...rest, isOnline: box.status === 'enrolled' && isBoxOnline(box.lastSeenAt) };
}
