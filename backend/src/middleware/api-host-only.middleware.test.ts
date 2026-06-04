import { describe, expect, it } from 'bun:test';
import { Hono } from 'hono';
import { createApiHostGuard } from './api-host-only.middleware';

// Sur le domaine API (api.neo-domotique.fr), les interfaces HTML doivent être
// masquées : seul /api reste joignable. Le back-office passe par le domaine staff.
function buildApp() {
  const app = new Hono();
  app.use('*', createApiHostGuard(new Set(['api.neo-domotique.fr'])));
  app.get('/backoffice', (c) => c.text('backoffice'));
  app.get('/backoffice/users', (c) => c.text('users'));
  app.get('/admin', (c) => c.text('admin'));
  app.get('/swagger', (c) => c.text('swagger'));
  app.get('/api/health', (c) => c.json({ ok: true }));
  app.get('/sign/abc', (c) => c.text('signature'));
  return app;
}

function req(app: Hono, path: string, host: string) {
  return app.request(path, { headers: { host } });
}

describe('apiHostGuard — domaine API headless', () => {
  it('renvoie 404 sur /backoffice depuis le host API', async () => {
    const res = await req(buildApp(), '/backoffice', 'api.neo-domotique.fr');
    expect(res.status).toBe(404);
    expect(await res.json()).toMatchObject({ error: { code: 'NOT_FOUND' } });
  });

  it('renvoie 404 sur les sous-chemins UI (/backoffice/users, /admin, /swagger)', async () => {
    const app = buildApp();
    for (const path of ['/backoffice/users', '/admin', '/swagger']) {
      const res = await req(app, path, 'api.neo-domotique.fr');
      expect(res.status).toBe(404);
    }
  });

  it('laisse passer /api et les pages publiques fonctionnelles sur le host API', async () => {
    const app = buildApp();
    expect((await req(app, '/api/health', 'api.neo-domotique.fr')).status).toBe(200);
    expect((await req(app, '/sign/abc', 'api.neo-domotique.fr')).status).toBe(200);
  });

  it('sert le back-office sur le host staff', async () => {
    const app = buildApp();
    const res = await req(app, '/backoffice', 'staff.neo-domotique.fr');
    expect(res.status).toBe(200);
    expect(await res.text()).toBe('backoffice');
  });

  it('ignore le port et préfère x-forwarded-host (derrière reverse-proxy)', async () => {
    const app = buildApp();
    const withPort = await app.request('/backoffice', {
      headers: { host: 'api.neo-domotique.fr:443' },
    });
    expect(withPort.status).toBe(404);

    const forwarded = await app.request('/backoffice', {
      headers: { host: 'internal:3000', 'x-forwarded-host': 'api.neo-domotique.fr' },
    });
    expect(forwarded.status).toBe(404);
  });

  it('ne filtre rien quand la liste d hôtes est vide (dev/local)', async () => {
    const app = new Hono();
    app.use('*', createApiHostGuard(new Set()));
    app.get('/backoffice', (c) => c.text('backoffice'));
    const res = await app.request('/backoffice', { headers: { host: 'localhost' } });
    expect(res.status).toBe(200);
  });
});
