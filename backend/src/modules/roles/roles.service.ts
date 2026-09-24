import { and, eq } from 'drizzle-orm';
import { db } from '../../config/database';
import { roles, userRoles } from '../../db/schema';
import { sanitizePermissions } from './permissions';

export interface RoleRecord {
  id: string;
  name: string;
  description: string | null;
  permissions: string[];
  isSystem: boolean;
  createdAt: Date;
}

export class RoleValidationError extends Error {}

/**
 * Normalize a role name: trimmed, non-empty, max 50 chars.
 * Pure — safe to unit-test.
 */
export function normalizeRoleName(input: unknown): string {
  const name = typeof input === 'string' ? input.trim() : '';
  if (name.length === 0) {
    throw new RoleValidationError('Le nom du rôle est requis');
  }
  if (name.length > 50) {
    throw new RoleValidationError('Le nom du rôle ne peut dépasser 50 caractères');
  }
  return name;
}

/**
 * Coerce a checkbox form value into a clean list of known permission keys.
 * Accepts the shapes `parseBody({ all: true })` can produce: undefined,
 * a single string, or an array of strings. Unknown keys are dropped.
 * Pure — safe to unit-test.
 */
export function normalizePermissionInput(input: unknown): string[] {
  const raw = input === undefined || input === null ? [] : Array.isArray(input) ? input : [input];
  return sanitizePermissions(raw.filter((v): v is string => typeof v === 'string'));
}

export async function listRoles(): Promise<RoleRecord[]> {
  return db.select().from(roles).orderBy(roles.name);
}

export async function getRole(id: string): Promise<RoleRecord | null> {
  const [role] = await db.select().from(roles).where(eq(roles.id, id)).limit(1);
  return role ?? null;
}

export async function createRole(input: {
  name: unknown;
  description?: unknown;
  permissions: unknown;
}): Promise<RoleRecord> {
  const name = normalizeRoleName(input.name);
  const description = typeof input.description === 'string' ? input.description.trim() || null : null;
  const permissions = normalizePermissionInput(input.permissions);

  const [created] = await db
    .insert(roles)
    .values({ name, description, permissions, isSystem: false })
    .returning();
  if (!created) {
    throw new RoleValidationError('Création du rôle impossible');
  }
  return created;
}

export async function updateRole(
  id: string,
  input: { name: unknown; description?: unknown; permissions: unknown }
): Promise<RoleRecord> {
  const existing = await getRole(id);
  if (!existing) {
    throw new RoleValidationError('Rôle introuvable');
  }

  const description = typeof input.description === 'string' ? input.description.trim() || null : null;
  const permissions = normalizePermissionInput(input.permissions);

  // A system role keeps its name (it is referenced by the legacy single-role
  // column and by bootstrap); only its description and permissions can change.
  const name = existing.isSystem ? existing.name : normalizeRoleName(input.name);

  const [updated] = await db
    .update(roles)
    .set({ name, description, permissions })
    .where(eq(roles.id, id))
    .returning();
  if (!updated) {
    throw new RoleValidationError('Rôle introuvable');
  }
  return updated;
}

/**
 * Compute which role links to add and remove to move a user from `current`
 * to `desired`. Both are sets of role ids. Pure — safe to unit-test.
 */
export function diffUserRoles(
  current: readonly string[],
  desired: readonly string[]
): { toAdd: string[]; toRemove: string[] } {
  const currentSet = new Set(current);
  const desiredSet = new Set(desired);
  return {
    toAdd: [...desiredSet].filter((id) => !currentSet.has(id)),
    toRemove: [...currentSet].filter((id) => !desiredSet.has(id)),
  };
}

export async function getUserRoleIds(userId: string): Promise<string[]> {
  const rows = await db
    .select({ roleId: userRoles.roleId })
    .from(userRoles)
    .where(eq(userRoles.userId, userId));
  return rows.map((r) => r.roleId);
}

/** Coerce checkbox form input into a list of valid, existing role ids. */
export async function setUserRoles(userId: string, desiredRoleIds: readonly string[]): Promise<void> {
  const known = await db.select({ id: roles.id }).from(roles);
  const knownIds = new Set(known.map((r) => r.id));
  const desired = [...new Set(desiredRoleIds)].filter((id) => knownIds.has(id));

  const current = await getUserRoleIds(userId);
  const { toAdd, toRemove } = diffUserRoles(current, desired);

  for (const roleId of toRemove) {
    await db
      .delete(userRoles)
      .where(and(eq(userRoles.userId, userId), eq(userRoles.roleId, roleId)));
  }
  if (toAdd.length > 0) {
    await db.insert(userRoles).values(toAdd.map((roleId) => ({ userId, roleId })));
  }
}

export async function deleteRole(id: string): Promise<void> {
  const existing = await getRole(id);
  if (!existing) {
    return;
  }
  if (existing.isSystem) {
    throw new RoleValidationError('Un rôle système ne peut pas être supprimé');
  }

  await db.delete(userRoles).where(eq(userRoles.roleId, id));
  await db.delete(roles).where(eq(roles.id, id));
}
