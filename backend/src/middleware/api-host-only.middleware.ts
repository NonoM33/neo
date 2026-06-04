import type { Context, Next } from 'hono';
import { apiOnlyHosts } from '../config/env';

// Préfixes d'interfaces HTML servies par le backend (back-office, admin, doc API).
const UI_PREFIXES = ['/backoffice', '/admin', '/swagger'];

function requestHost(c: Context): string {
  const raw = c.req.header('x-forwarded-host') ?? c.req.header('host') ?? '';
  return raw.split(',')[0]!.trim().split(':')[0]!.toLowerCase();
}

function isUiPath(path: string): boolean {
  return UI_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}

/**
 * Sur les domaines déclarés "API seule", les interfaces HTML renvoient 404.
 * Le back-office reste accessible via le domaine staff (reverse-proxy).
 */
export function createApiHostGuard(hosts: Set<string>) {
  return async function apiHostGuard(c: Context, next: Next) {
    if (hosts.size > 0 && hosts.has(requestHost(c)) && isUiPath(c.req.path)) {
      return c.json({ error: { message: 'Route non trouvée', code: 'NOT_FOUND' } }, 404);
    }
    await next();
  };
}

export const blockUiOnApiHost = createApiHostGuard(apiOnlyHosts);
