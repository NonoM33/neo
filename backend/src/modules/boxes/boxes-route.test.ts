import { describe, expect, it } from 'bun:test';
import { Hono } from 'hono';
import { errorHandler } from '../../middleware/error.middleware';
import boxesRouter from './boxes.routes';

// Reproduit le bug vu au premier boot du simulateur : /announce repondait 401
// parce qu'un middleware admin global s'appliquait a toutes les routes.
function app() {
  const a = new Hono();
  a.onError(errorHandler);
  a.route('/api/boxes', boxesRouter);
  return a;
}

function post(path: string, body: unknown, headers: Record<string, string> = {}) {
  return app().request(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
}

describe('/api/boxes — qui doit s\'authentifier', () => {
  it('/announce est ouvert a une box sans cle : un corps invalide donne 400, jamais 401', async () => {
    const res = await post('/api/boxes/announce', { nope: true });
    expect(res.status).toBe(400);
  });

  it('/me/heartbeat exige la cle de box', async () => {
    const res = await post('/api/boxes/me/heartbeat', { state: {} });
    expect(res.status).toBe(401);
  });

  it('/claim exige un utilisateur staff', async () => {
    const res = await post('/api/boxes/claim', { provisioning_token: 'x', client_id: 'y' });
    expect(res.status).toBe(401);
  });

  it('la liste et le detail exigent un admin', async () => {
    expect((await app().request('/api/boxes')).status).toBe(401);
    expect((await app().request('/api/boxes/some-id')).status).toBe(401);
  });
});
