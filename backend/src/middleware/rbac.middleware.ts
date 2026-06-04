import type { Context, Next } from 'hono';
import { ForbiddenError } from '../lib/errors';
import type { JWTPayload } from './auth.middleware';
import type { RoleType } from '../db/schema/users';
import { hasPermission as hasPermissionKey } from '../modules/roles/permissions';

/**
 * Check if user has at least one of the allowed roles
 * Supports both legacy single role and new multi-role array
 */
export function requireRole(...allowedRoles: RoleType[]) {
  return async (c: Context, next: Next) => {
    const user = c.get('user') as JWTPayload;

    if (!user) {
      throw new ForbiddenError('Utilisateur non authentifié');
    }

    // Check multi-role array first, fallback to legacy single role
    const userRoles = user.roles || [user.role];
    const hasRole = userRoles.some((role) => (allowedRoles as string[]).includes(role));

    if (!hasRole) {
      throw new ForbiddenError(`Rôle requis: ${allowedRoles.join(' ou ')}`);
    }

    await next();
  };
}

/**
 * Check if user has ALL of the required roles
 */
export function requireAllRoles(...requiredRoles: RoleType[]) {
  return async (c: Context, next: Next) => {
    const user = c.get('user') as JWTPayload;

    if (!user) {
      throw new ForbiddenError('Utilisateur non authentifié');
    }

    const userRoles = user.roles || [user.role];
    const hasAllRoles = requiredRoles.every((role) => userRoles.includes(role));

    if (!hasAllRoles) {
      throw new ForbiddenError(`Rôles requis: ${requiredRoles.join(' et ')}`);
    }

    await next();
  };
}

/**
 * Require admin role
 */
export function requireAdmin() {
  return requireRole('admin');
}

/**
 * Require integrateur or admin role
 */
export function requireIntegrateurOrAdmin() {
  return requireRole('admin', 'integrateur');
}

/**
 * Require auditeur, integrateur, or admin role
 */
export function requireAuditeur() {
  return requireRole('admin', 'integrateur', 'auditeur');
}

/**
 * Require commercial or admin role - for CRM access
 */
export function requireCommercialOrAdmin() {
  return requireRole('admin', 'commercial');
}

/**
 * Require CRM access - admin, commercial, or integrateur
 * Integrateurs can view their converted projects' lead history
 */
export function requireCRMAccess() {
  return requireRole('admin', 'commercial', 'integrateur');
}

/**
 * Require any authenticated user
 */
export function requireAuthenticated() {
  return async (c: Context, next: Next) => {
    const user = c.get('user') as JWTPayload;

    if (!user) {
      throw new ForbiddenError('Utilisateur non authentifié');
    }

    await next();
  };
}

/**
 * Helper to check if current user has a specific role
 */
export function userHasRole(user: JWTPayload, role: RoleType): boolean {
  const userRoles = user.roles || [user.role];
  return (userRoles as string[]).includes(role);
}

/**
 * Helper to check if current user has any of the specified roles
 */
export function userHasAnyRole(user: JWTPayload, roles: RoleType[]): boolean {
  const userRoles = user.roles || [user.role];
  return userRoles.some((role) => (roles as string[]).includes(role));
}

/**
 * Helper to check if user is admin
 */
export function isAdmin(user: JWTPayload): boolean {
  return userHasRole(user, 'admin');
}

/**
 * Helper to check if the current user holds a given permission.
 * A super-admin (admin role) always passes.
 */
export function userHasPermission(user: JWTPayload, permissionKey: string): boolean {
  return hasPermissionKey(user.permissions ?? [], permissionKey, isAdmin(user));
}

/**
 * Require a specific permission. Admins bypass the check.
 */
export function requirePermission(permissionKey: string) {
  return async (c: Context, next: Next) => {
    const user = c.get('user') as JWTPayload;

    if (!user) {
      throw new ForbiddenError('Utilisateur non authentifié');
    }

    if (!userHasPermission(user, permissionKey)) {
      throw new ForbiddenError('Permission insuffisante');
    }

    await next();
  };
}

/**
 * Helper to check if user is commercial
 */
export function isCommercial(user: JWTPayload): boolean {
  return userHasRole(user, 'commercial');
}
