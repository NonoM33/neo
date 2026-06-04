import { sign, verify } from 'jsonwebtoken';
import { hash, verify as verifyPassword } from 'argon2';
import { eq, and, gt } from 'drizzle-orm';
import { db } from '../../config/database';
import { users, refreshTokens, userRoles, roles } from '../../db/schema';
import { env } from '../../config/env';
import { UnauthorizedError } from '../../lib/errors';
import type { JWTPayload } from '../../middleware/auth.middleware';
import type { RoleType } from '../../db/schema/users';
import { aggregatePermissions } from '../roles/permissions';

export async function hashPassword(password: string): Promise<string> {
  return hash(password);
}

export async function verifyPasswordHash(password: string, hashedPassword: string): Promise<boolean> {
  return verifyPassword(hashedPassword, password);
}

function generateAccessToken(payload: JWTPayload): string {
  return sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as string,
  } as any);
}

function generateRefreshToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 64; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

function parseExpiration(expiresIn: string | undefined): number {
  if (!expiresIn) {
    return 7 * 24 * 60 * 60 * 1000; // Default 7 days
  }
  const match = expiresIn.match(/^(\d+)([smhd])$/);
  if (!match || !match[1] || !match[2]) {
    return 7 * 24 * 60 * 60 * 1000; // Default 7 days
  }

  const value = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case 's':
      return value * 1000;
    case 'm':
      return value * 60 * 1000;
    case 'h':
      return value * 60 * 60 * 1000;
    case 'd':
      return value * 24 * 60 * 60 * 1000;
    default:
      return 7 * 24 * 60 * 60 * 1000;
  }
}

/**
 * Get all roles for a user from the user_roles junction table
 * Falls back to legacy single role if no roles found
 */
async function getUserRolesAndPermissions(
  userId: string,
  legacyRole: RoleType
): Promise<{ roles: string[]; permissions: string[] }> {
  const userRoleRecords = await db
    .select({
      roleName: roles.name,
      permissions: roles.permissions,
    })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .where(eq(userRoles.userId, userId));

  if (userRoleRecords.length === 0) {
    // Fallback to legacy single role for backward compatibility, resolving its
    // permissions from the roles table when the built-in role exists.
    const [legacy] = await db
      .select({ permissions: roles.permissions })
      .from(roles)
      .where(eq(roles.name, legacyRole))
      .limit(1);
    return {
      roles: [legacyRole],
      permissions: aggregatePermissions([legacy?.permissions ?? []]),
    };
  }

  return {
    roles: userRoleRecords.map((r) => r.roleName),
    permissions: aggregatePermissions(userRoleRecords.map((r) => r.permissions ?? [])),
  };
}

export async function login(email: string, password: string) {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (!user) {
    throw new UnauthorizedError('Email ou mot de passe incorrect');
  }

  if (!user.isActive) {
    throw new UnauthorizedError('Compte désactivé');
  }

  const validPassword = await verifyPasswordHash(password, user.password);
  if (!validPassword) {
    throw new UnauthorizedError('Email ou mot de passe incorrect');
  }

  // Get all user roles and aggregated permissions
  const { roles: userRolesList, permissions } = await getUserRolesAndPermissions(user.id, user.role);

  const payload: JWTPayload = {
    userId: user.id,
    email: user.email,
    role: user.role, // Legacy single role for backward compatibility
    roles: userRolesList, // Multi-role array
    permissions,
  };

  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken();

  const expiresAt = new Date(Date.now() + parseExpiration(env.JWT_REFRESH_EXPIRES_IN));

  await db.insert(refreshTokens).values({
    userId: user.id,
    token: refreshToken,
    expiresAt,
  });

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      roles: userRolesList,
      permissions,
    },
  };
}

/**
 * Build the staff JWT payload from a resolved identity. Pure (no I/O) so the
 * token contract used by both login and the back-office "parcours" can be
 * asserted in tests without a database.
 */
export function buildStaffTokenPayload(identity: {
  userId: string;
  email: string;
  role: JWTPayload['role'];
  roles: string[];
  permissions: string[];
}): JWTPayload {
  return {
    userId: identity.userId,
    email: identity.email,
    role: identity.role,
    roles: identity.roles,
    permissions: identity.permissions,
  };
}

/**
 * Mint a staff access token for an already-authenticated user, without a
 * password check. Used by the back-office guided journey ("parcours"), whose
 * browser-side wizard calls the same protected /api endpoints as the field app.
 * The payload is identical to the one issued at login, so RBAC behaves the same.
 */
export async function mintAccessTokenForUser(userId: string): Promise<string> {
  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      role: users.role,
      isActive: users.isActive,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user || !user.isActive) {
    throw new UnauthorizedError('Utilisateur introuvable ou désactivé');
  }

  const { roles: userRolesList, permissions } = await getUserRolesAndPermissions(
    user.id,
    user.role
  );

  return generateAccessToken(
    buildStaffTokenPayload({
      userId: user.id,
      email: user.email,
      role: user.role,
      roles: userRolesList,
      permissions,
    })
  );
}

export async function refresh(refreshToken: string) {
  const [token] = await db
    .select()
    .from(refreshTokens)
    .where(
      and(
        eq(refreshTokens.token, refreshToken),
        gt(refreshTokens.expiresAt, new Date())
      )
    )
    .limit(1);

  if (!token) {
    throw new UnauthorizedError('Refresh token invalide ou expiré');
  }

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, token.userId))
    .limit(1);

  if (!user) {
    throw new UnauthorizedError('Utilisateur non trouvé');
  }

  if (!user.isActive) {
    throw new UnauthorizedError('Compte désactivé');
  }

  // Delete old refresh token
  await db.delete(refreshTokens).where(eq(refreshTokens.id, token.id));

  // Get all user roles and aggregated permissions
  const { roles: userRolesList, permissions } = await getUserRolesAndPermissions(user.id, user.role);

  const payload: JWTPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    roles: userRolesList,
    permissions,
  };

  const accessToken = generateAccessToken(payload);
  const newRefreshToken = generateRefreshToken();

  const expiresAt = new Date(Date.now() + parseExpiration(env.JWT_REFRESH_EXPIRES_IN));

  await db.insert(refreshTokens).values({
    userId: user.id,
    token: newRefreshToken,
    expiresAt,
  });

  return {
    accessToken,
    refreshToken: newRefreshToken,
  };
}

export async function logout(refreshToken: string) {
  await db.delete(refreshTokens).where(eq(refreshTokens.token, refreshToken));
}

export async function logoutAll(userId: string) {
  await db.delete(refreshTokens).where(eq(refreshTokens.userId, userId));
}

export async function getMe(userId: string) {
  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
      phone: users.phone,
      role: users.role,
      isActive: users.isActive,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    throw new UnauthorizedError('Utilisateur non trouvé');
  }

  // Get all user roles and aggregated permissions
  const { roles: userRolesList, permissions } = await getUserRolesAndPermissions(user.id, user.role);

  return {
    ...user,
    roles: userRolesList,
    permissions,
  };
}

/**
 * Assign a role to a user
 */
export async function assignRole(userId: string, roleName: RoleType) {
  // Find the role
  const [role] = await db
    .select({ id: roles.id })
    .from(roles)
    .where(eq(roles.name, roleName))
    .limit(1);

  if (!role) {
    throw new Error(`Role '${roleName}' not found`);
  }

  // Check if already assigned
  const [existing] = await db
    .select({ id: userRoles.id })
    .from(userRoles)
    .where(and(eq(userRoles.userId, userId), eq(userRoles.roleId, role.id)))
    .limit(1);

  if (existing) {
    return; // Already assigned
  }

  await db.insert(userRoles).values({
    userId,
    roleId: role.id,
  });
}

/**
 * Remove a role from a user
 */
export async function removeRole(userId: string, roleName: RoleType) {
  const [role] = await db
    .select({ id: roles.id })
    .from(roles)
    .where(eq(roles.name, roleName))
    .limit(1);

  if (!role) {
    return;
  }

  await db
    .delete(userRoles)
    .where(and(eq(userRoles.userId, userId), eq(userRoles.roleId, role.id)));
}
