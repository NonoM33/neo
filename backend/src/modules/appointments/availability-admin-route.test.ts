import { describe, expect, it, mock } from 'bun:test';
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { requireAdmin } from '../../middleware/rbac.middleware';
import { errorHandler } from '../../middleware/error.middleware';
import { setAvailabilitySchema } from './appointments.schema';
import type { JWTPayload } from '../../middleware/auth.middleware';

// Builds an app reproducing the exact middleware chain + handler body of
// `PUT /api/availability/admin/:userId`, injecting `user` the way authMiddleware
// would (without touching the DB). A spy stands in for the availability service.
function buildApp(user: JWTPayload, setSpy: (userId: string, input: unknown) => void) {
  const app = new Hono();
  app.onError(errorHandler);
  app.use('*', async (c, next) => {
    c.set('user', user);
    await next();
  });
  app.put('/admin/:userId', requireAdmin(), zValidator('json', setAvailabilitySchema), async (c) => {
    const userId = c.req.param('userId');
    const input = c.req.valid('json');
    setSpy(userId, input);
    return c.json([]);
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

const validBody = { slots: [{ dayOfWeek: 'lundi', startTime: '09:00', endTime: '18:00', isActive: true }] };

describe('PUT /api/availability/admin/:userId', () => {
  it('forbids a non-admin from editing another user availability', async () => {
    const spy = mock(() => {});
    const app = buildApp(commercialUser, spy);

    const res = await app.request('/admin/target-42', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validBody),
    });

    expect(res.status).toBe(403);
    expect(spy).not.toHaveBeenCalled();
  });

  it('lets an admin set the availability of the targeted user (path param, not caller)', async () => {
    let receivedUserId = '';
    const app = buildApp(adminUser, (userId) => {
      receivedUserId = userId;
    });

    const res = await app.request('/admin/target-42', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validBody),
    });

    expect(res.status).toBe(200);
    expect(receivedUserId).toBe('target-42');
  });
});
