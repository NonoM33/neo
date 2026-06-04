import type { Context, Next } from 'hono';
import { verify } from 'jsonwebtoken';
import { env } from '../config/env';
import { db } from '../config/database';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';
import { UnauthorizedError } from '../lib/errors';
import type { RoleType } from '../db/schema/users';

export interface JWTPayload {
  userId: string;
  email: string;
  role: RoleType; // Legacy single role
  roles: string[]; // Multi-role array (built-in + custom role names)
  permissions: string[]; // Aggregated permission keys from the user's roles
}

declare module 'hono' {
  interface ContextVariableMap {
    user: JWTPayload;
    userId: string;
  }
}

export async function authMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new UnauthorizedError('Token manquant');
  }

  const token = authHeader.substring(7);

  try {
    const payload = verify(token, env.JWT_SECRET) as JWTPayload;

    // Verify user still exists and is active
    const [user] = await db
      .select({ id: users.id, isActive: users.isActive })
      .from(users)
      .where(eq(users.id, payload.userId))
      .limit(1);

    if (!user) {
      throw new UnauthorizedError('Utilisateur non trouvé');
    }

    if (!user.isActive) {
      throw new UnauthorizedError('Compte désactivé');
    }

    // Ensure roles/permissions arrays exist (backward compatibility with
    // tokens issued before multi-role / permissions support)
    if (!payload.roles) {
      payload.roles = [payload.role];
    }
    if (!payload.permissions) {
      payload.permissions = [];
    }

    c.set('user', payload);
    c.set('userId', payload.userId);

    await next();
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      throw error;
    }
    throw new UnauthorizedError('Token invalide ou expiré');
  }
}
