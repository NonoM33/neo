import type { Context, Next } from 'hono';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import { db } from '../../config/database';
import { users, userRoles, roles } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { sign, verify } from 'jsonwebtoken';
import { env } from '../../config/env';
import {
  aggregatePermissions,
  permissionForPath,
  hasPermission,
  ADMIN_ONLY_PERMISSIONS,
} from '../../modules/roles/permissions';

const SESSION_COOKIE = 'backoffice_session';
const SESSION_EXPIRY = 60 * 60 * 24; // 24 hours in seconds

interface SessionPayload {
  userId: string;
}

export interface AdminUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'integrateur' | 'auditeur';
  /** Aggregated permission keys from the user's assigned roles. */
  permissions: string[];
  /** Legacy admin role: bypasses every permission check. */
  isSuperAdmin: boolean;
}

/**
 * Resolve a user's backoffice access from their assigned roles.
 * The legacy `admin` role is a super-admin (full access). Other users get the
 * union of the permissions ticked on their roles.
 */
export async function loadBackofficeAccess(
  userId: string,
  legacyRole: AdminUser['role']
): Promise<{ permissions: string[]; isSuperAdmin: boolean }> {
  if (legacyRole === 'admin') {
    return { permissions: [], isSuperAdmin: true };
  }

  const records = await db
    .select({ permissions: roles.permissions })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .where(eq(userRoles.userId, userId));

  return {
    permissions: aggregatePermissions(records.map((r) => r.permissions ?? [])),
    isSuperAdmin: false,
  };
}

/** Whether a user may reach the backoffice at all (admin or any permission). */
export function canAccessBackoffice(access: { permissions: string[]; isSuperAdmin: boolean }): boolean {
  return access.isSuperAdmin || access.permissions.length > 0;
}

export async function createSession(c: Context, user: AdminUser): Promise<void> {
  const payload: SessionPayload = {
    userId: user.id,
  };

  const token = sign(payload, env.JWT_SECRET, {
    expiresIn: SESSION_EXPIRY,
  });

  setCookie(c, SESSION_COOKIE, token, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'Lax',
    maxAge: SESSION_EXPIRY,
    path: '/backoffice',
  });
}

export function destroySession(c: Context): void {
  deleteCookie(c, SESSION_COOKIE, {
    path: '/backoffice',
  });
}

export async function getSessionUser(c: Context): Promise<AdminUser | null> {
  const token = getCookie(c, SESSION_COOKIE);

  if (!token) {
    return null;
  }

  try {
    const payload = verify(token, env.JWT_SECRET) as SessionPayload;

    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role,
      })
      .from(users)
      .where(eq(users.id, payload.userId))
      .limit(1);

    if (!user) {
      return null;
    }

    const access = await loadBackofficeAccess(user.id, user.role);
    return { ...user, ...access };
  } catch {
    return null;
  }
}

export async function requireAdmin(c: Context, next: Next) {
  const user = await getSessionUser(c);

  if (!user) {
    return c.redirect('/backoffice/login');
  }

  if (!canAccessBackoffice(user)) {
    return c.redirect('/backoffice/login?error=access_denied');
  }

  // Section-level enforcement: map the request path to a required permission.
  const requiredPermission = permissionForPath(c.req.path);
  if (requiredPermission) {
    const adminOnly = ADMIN_ONLY_PERMISSIONS.includes(requiredPermission);
    const allowed = adminOnly
      ? user.isSuperAdmin
      : hasPermission(user.permissions, requiredPermission, user.isSuperAdmin);
    if (!allowed) {
      return c.redirect('/backoffice?error=forbidden');
    }
  }

  c.set('adminUser', user);
  await next();
}

export async function optionalAuth(c: Context, next: Next) {
  const user = await getSessionUser(c);
  if (user) {
    c.set('adminUser', user);
  }
  await next();
}
