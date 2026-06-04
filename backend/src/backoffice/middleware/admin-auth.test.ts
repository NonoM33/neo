import { describe, expect, it } from 'bun:test';
import { Hono } from 'hono';
import { createSession, type AdminUser } from './admin-auth';

// Régression : le cookie de session était posé avec path:'/backoffice'. Le
// handshake WebSocket de la console staff vise /ws/chatbot/staff, hors de cette
// portée → le cookie n'était pas envoyé → getSessionUser renvoie null → le WS
// se fermait en 1008 "Unauthorized" → la console restait "déconnecté".
const STAFF_WS_PATH = '/ws/chatbot/staff';

const fakeUser: AdminUser = {
  id: '00000000-0000-0000-0000-000000000000',
  email: 'admin@example.com',
  firstName: 'Admin',
  lastName: 'Neo',
  role: 'admin',
  permissions: ['support.manage'],
  isSuperAdmin: true,
};

function cookiePath(setCookieHeader: string): string {
  return setCookieHeader.match(/[Pp]ath=([^;]+)/)?.[1] ?? '/';
}

async function setCookieFromSession(): Promise<string> {
  const app = new Hono();
  app.get('/login', async (c) => {
    await createSession(c, fakeUser);
    return c.text('ok');
  });
  const res = await app.request('/login');
  const header = res.headers.get('set-cookie');
  if (!header) throw new Error('Aucun cookie de session posé');
  return header;
}

describe('createSession — portée du cookie', () => {
  it('pose un cookie dont le path couvre le handshake WS staff', async () => {
    const header = await setCookieFromSession();
    const path = cookiePath(header);
    // Le path du cookie doit être un préfixe du chemin du WS staff,
    // sinon le navigateur n'enverra pas le cookie sur le handshake.
    expect(STAFF_WS_PATH.startsWith(path)).toBe(true);
  });

  it('utilise une portée racine (pas restreinte à /backoffice)', async () => {
    const header = await setCookieFromSession();
    expect(cookiePath(header)).toBe('/');
  });
});
