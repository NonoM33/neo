import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import { and, desc, eq, inArray, isNull } from 'drizzle-orm';
import { db } from '../../config/database';
import { roles, systemApiTokens } from '../../db/schema';
import type { RoleType } from '../../db/schema/users';
import type { JWTPayload } from '../../middleware/auth.middleware';
import { PERMISSION_KEYS, aggregatePermissions } from '../roles/permissions';

// Toutes les clés portent ce préfixe : il rend le jeton reconnaissable et permet
// au middleware d'auth de router une requête vers la validation "jeton API"
// plutôt que la vérification JWT classique.
export const TOKEN_PREFIX = 'neo_sk_';
const RANDOM_BYTES = 24; // 48 caractères hex après le préfixe.
const BUILTIN_ROLES: readonly RoleType[] = ['admin', 'integrateur', 'auditeur', 'commercial'];

// ----- Fonctions pures (sans DB, testables en isolation) -----

/** Génère un jeton porteur opaque : `neo_sk_` + 48 caractères hexadécimaux. */
export function generateRawToken(): string {
  return TOKEN_PREFIX + randomBytes(RANDOM_BYTES).toString('hex');
}

/** Empreinte SHA-256 (hex) du jeton — seule forme stockée en base. */
export function hashToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

/** Vrai si la chaîne a la forme d'un jeton API (préfixe + longueur attendue). */
export function isApiTokenFormat(raw: string): boolean {
  return raw.startsWith(TOKEN_PREFIX) && raw.length === TOKEN_PREFIX.length + RANDOM_BYTES * 2;
}

/** Préfixe affichable (jamais le secret entier) pour reconnaître un jeton. */
export function tokenDisplayPrefix(raw: string): string {
  return raw.slice(0, TOKEN_PREFIX.length + 8);
}

/** Comparaison d'empreintes à temps constant (anti timing-attack). */
export function hashesEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

export interface TokenRoleRow {
  name: string;
  permissions: string[];
}

export interface TokenAccess {
  roleNames: string[];
  permissions: string[];
  primaryRole: RoleType;
  isSuperAdmin: boolean;
}

/**
 * Résout l'accès d'un jeton à partir des rôles qui lui sont rattachés.
 * Le rôle `admin` est super-admin (toutes les permissions). Sinon on prend
 * l'union des permissions cochées sur les rôles. Pur — testable.
 */
export function resolveTokenAccess(roleRows: readonly TokenRoleRow[]): TokenAccess {
  const roleNames = roleRows.map((r) => r.name);
  const isSuperAdmin = roleNames.includes('admin');
  const permissions = isSuperAdmin
    ? [...PERMISSION_KEYS]
    : aggregatePermissions(roleRows.map((r) => r.permissions ?? []));
  const primaryRole =
    (roleNames.find((n): n is RoleType => (BUILTIN_ROLES as readonly string[]).includes(n)) as
      | RoleType
      | undefined) ?? 'auditeur';
  return { roleNames, permissions, primaryRole, isSuperAdmin };
}

// ----- Opérations base de données -----

export interface CreateTokenInput {
  name: string;
  roleIds: string[];
  createdBy?: string | null;
  createdByEmail?: string | null;
}

/**
 * Crée un jeton et renvoie le secret EN CLAIR une seule fois (jamais re-stocké).
 * L'appelant doit l'afficher immédiatement à l'utilisateur.
 */
export async function createToken(input: CreateTokenInput): Promise<{ id: string; raw: string }> {
  const raw = generateRawToken();
  const [created] = await db
    .insert(systemApiTokens)
    .values({
      name: input.name.trim(),
      tokenPrefix: tokenDisplayPrefix(raw),
      tokenHash: hashToken(raw),
      roleIds: input.roleIds,
      createdBy: input.createdBy ?? null,
      createdByEmail: input.createdByEmail ?? null,
    })
    .returning({ id: systemApiTokens.id });

  return { id: created!.id, raw };
}

export interface TokenListItem {
  id: string;
  name: string;
  tokenPrefix: string;
  roleNames: string[];
  createdByEmail: string | null;
  lastUsedAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
}

/** Liste les jetons avec les noms de rôles résolus, plus récents d'abord. */
export async function listTokens(): Promise<TokenListItem[]> {
  const tokens = await db
    .select()
    .from(systemApiTokens)
    .orderBy(desc(systemApiTokens.createdAt));

  const allRoleIds = [...new Set(tokens.flatMap((t) => t.roleIds))];
  const roleNameById = new Map<string, string>();
  if (allRoleIds.length > 0) {
    const roleRows = await db
      .select({ id: roles.id, name: roles.name })
      .from(roles)
      .where(inArray(roles.id, allRoleIds));
    for (const r of roleRows) roleNameById.set(r.id, r.name);
  }

  return tokens.map((t) => ({
    id: t.id,
    name: t.name,
    tokenPrefix: t.tokenPrefix,
    roleNames: t.roleIds.map((id) => roleNameById.get(id) ?? id),
    createdByEmail: t.createdByEmail,
    lastUsedAt: t.lastUsedAt,
    revokedAt: t.revokedAt,
    createdAt: t.createdAt,
  }));
}

/** Révoque un jeton (révocation manuelle, irréversible côté usage). */
export async function revokeToken(id: string): Promise<void> {
  await db
    .update(systemApiTokens)
    .set({ revokedAt: new Date() })
    .where(and(eq(systemApiTokens.id, id), isNull(systemApiTokens.revokedAt)));
}

/**
 * Authentifie une requête porteuse d'un jeton API. Renvoie un payload compatible
 * avec le middleware d'auth (mêmes champs qu'un JWT staff) ou null si le jeton est
 * inconnu/révoqué. Met à jour `lastUsedAt` au passage.
 */
export async function authenticateApiToken(raw: string): Promise<JWTPayload | null> {
  if (!isApiTokenFormat(raw)) {
    return null;
  }

  const [token] = await db
    .select()
    .from(systemApiTokens)
    .where(eq(systemApiTokens.tokenHash, hashToken(raw)))
    .limit(1);

  if (!token || token.revokedAt) {
    return null;
  }

  const roleRows =
    token.roleIds.length > 0
      ? await db
          .select({ name: roles.name, permissions: roles.permissions })
          .from(roles)
          .where(inArray(roles.id, token.roleIds))
      : [];

  const access = resolveTokenAccess(roleRows);

  await db
    .update(systemApiTokens)
    .set({ lastUsedAt: new Date() })
    .where(eq(systemApiTokens.id, token.id));

  return {
    userId: token.createdBy ?? `apitoken:${token.id}`,
    email: token.createdByEmail ?? `apitoken:${token.id}`,
    role: access.primaryRole,
    roles: access.roleNames,
    permissions: access.permissions,
  };
}
