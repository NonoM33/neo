import { describe, expect, it, mock } from 'bun:test';
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { requireAdmin } from '../../middleware/rbac.middleware';
import { errorHandler } from '../../middleware/error.middleware';
import { createTokenSchema } from './system-tokens.routes';
import type { JWTPayload } from '../../middleware/auth.middleware';

// Reproduces the admin-guard + validation chain that the POST /api/system-tokens
// route shares, injecting `user` the way authMiddleware would, without the DB.
function buildApp(user: JWTPayload, createSpy: (input: unknown) => void) {
  const app = new Hono();
  app.onError(errorHandler);
  app.use('*', async (c, next) => {
    c.set('user', user);
    await next();
  });
  app.use('*', requireAdmin());
  app.post('/', zValidator('json', createTokenSchema), async (c) => {
    const input = c.req.valid('json');
    createSpy(input);
    return c.json({ id: 't1', raw: 'neo_sk_secret' }, 201);
  });
  return app;
}

const adminUser: JWTPayload = {
  userId: 'admin-1',
  email: 'admin@neo.fr',
  role: 'admin',
  roles: ['admin'],
  permissions: [],
};

const commercialUser: JWTPayload = {
  userId: 'commercial-1',
  email: 'sales@neo.fr',
  role: 'commercial',
  roles: ['commercial'],
  permissions: [],
};

const ROLE_ID = '11111111-1111-4111-8111-111111111111';

function post(app: Hono, body: unknown) {
  return app.request('/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('/api/system-tokens guard & validation', () => {
  it('forbids a non-admin from creating a token', async () => {
    const spy = mock(() => {});
    const res = await post(buildApp(commercialUser, spy), {
      name: 'CI token',
      roleIds: [ROLE_ID],
    });
    expect(res.status).toBe(403);
    expect(spy).not.toHaveBeenCalled();
  });

  it('rejects an empty name with 400', async () => {
    const spy = mock(() => {});
    const res = await post(buildApp(adminUser, spy), { name: '   ', roleIds: [ROLE_ID] });
    expect(res.status).toBe(400);
    expect(spy).not.toHaveBeenCalled();
  });

  it('rejects an empty roleIds list with 400', async () => {
    const spy = mock(() => {});
    const res = await post(buildApp(adminUser, spy), { name: 'CI token', roleIds: [] });
    expect(res.status).toBe(400);
    expect(spy).not.toHaveBeenCalled();
  });

  it('accepts a valid payload from an admin and returns the raw secret once', async () => {
    let received: unknown;
    const res = await post(
      buildApp(adminUser, (input) => {
        received = input;
      }),
      { name: 'CI token', roleIds: [ROLE_ID] },
    );
    expect(res.status).toBe(201);
    expect(received).toEqual({ name: 'CI token', roleIds: [ROLE_ID] });
    const body = (await res.json()) as { id: string; raw: string };
    expect(body.raw).toBe('neo_sk_secret');
  });
});
