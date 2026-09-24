import type { Context, Next } from 'hono';
import { UnauthorizedError } from '../../lib/errors';
import type { Box } from '../../db/schema/boxes';
import { hashSecret, isBoxApiKeyFormat } from './boxes.domain';

declare module 'hono' {
  interface ContextVariableMap {
    box: Box;
  }
}

export type FindBoxByApiKeyHash = (hash: string) => Promise<Box | null>;

/**
 * Authentifie une BOX (pas un utilisateur) par sa cle `neo_box_...`.
 * Le lookup est injecte pour que le middleware se teste sans base.
 */
export function boxAuthMiddleware(findByHash: FindBoxByApiKeyHash) {
  return async (c: Context, next: Next) => {
    const header = c.req.header('Authorization');
    if (!header || !header.startsWith('Bearer ')) {
      throw new UnauthorizedError('Cle de box manquante');
    }
    const raw = header.substring(7);
    if (!isBoxApiKeyFormat(raw)) {
      throw new UnauthorizedError('Cle de box invalide');
    }
    const box = await findByHash(hashSecret(raw));
    if (!box || box.status !== 'enrolled') {
      throw new UnauthorizedError('Cle de box invalide ou revoquee');
    }
    c.set('box', box);
    await next();
  };
}
