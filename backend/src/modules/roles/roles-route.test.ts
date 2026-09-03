import { describe, expect, it, mock } from 'bun:test';
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { requireAdmin } from '../../middleware/rbac.middleware';
import { errorHandler } from '../../middleware/error.middleware';
import { roleBodySchema } from './roles.routes';
import type { JWTPayload } from '../../middleware/auth.middleware';

// Reproduces the admin-guard + validation chain that every /api/roles route
// shares, injecting `user` the way authMiddleware would, without touching the DB.
function buildApp(user: JWTPayload, createSpy: (input: unknown) => void) {
  const app = new Hono();
  app.onError(errorHandler);
  app.use('*', async (c, next) => {
    c.set('user', user);
    await next();
  });
  app.use('*', requireAdmin());
  app.post('/', zValidator('json', roleBodySchema), async (c) => {
    const input = c.req.valid('json');
    createSpy(input);
    return c.json({ id: 'r1', ...input }, 201);
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

function post(app: Hono, body: unknown) {
  return app.request('/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('/api/roles guard & validation', () => {
  it('forbids a non-admin from creating a role', async () => {
    const spy = mock(() => {});
    const res = await post(buildApp(commercialUser, spy), {
      name: 'Support N1',
      permissions: ['support.manage'],
    });
    expect(res.status).toBe(403);
    expect(spy).not.toHaveBeenCalled();
  });

  it('rejects an empty role name with 400', async () => {
    const spy = mock(() => {});
    const res = await post(buildApp(adminUser, spy), { name: '   ', permissions: [] });
    expect(res.status).toBe(400);
    expect(spy).not.toHaveBeenCalled();
  });

  it('accepts a valid payload from an admin', async () => {
    let received: unknown;
    const res = await post(buildApp(adminUser, (input) => {
      received = input;
    }), { name: 'Support N1', description: 'Niveau 1', permissions: ['support.manage'] });
    expect(res.status).toBe(201);
    expect(received).toEqual({
      name: 'Support N1',
      description: 'Niveau 1',
      permissions: ['support.manage'],
    });
  });
});
