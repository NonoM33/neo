import { describe, expect, it, mock } from 'bun:test';
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { requireCRMAccess } from '../../middleware/rbac.middleware';
import { errorHandler } from '../../middleware/error.middleware';
import { createPaymentLinkSchema } from './payments.schema';
import type { JWTPayload } from '../../middleware/auth.middleware';

// Reproduit la chaîne guard (commercial/admin) + validation de POST /api/payments
// en injectant `user` comme le ferait authMiddleware, sans toucher la DB ni Stripe.
function buildApp(user: JWTPayload, createSpy: (input: unknown) => void) {
  const app = new Hono();
  app.onError(errorHandler);
  app.use('*', async (c, next) => {
    c.set('user', user);
    await next();
  });
  app.use('*', requireCRMAccess());
  app.post('/', zValidator('json', createPaymentLinkSchema), async (c) => {
    createSpy(c.req.valid('json'));
    return c.json({ ok: true }, 201);
  });
  return app;
}

const admin: JWTPayload = {
  userId: 'a1',
  email: 'a@neo.fr',
  role: 'admin',
  roles: ['admin'],
  permissions: [],
};
const commercial: JWTPayload = {
  userId: 'c1',
  email: 'c@neo.fr',
  role: 'commercial',
  roles: ['commercial'],
  permissions: [],
};
const integrateur: JWTPayload = {
  userId: 'i1',
  email: 'i@neo.fr',
  role: 'integrateur',
  roles: ['integrateur'],
  permissions: [],
};
const auditeur: JWTPayload = {
  userId: 'au1',
  email: 'au@neo.fr',
  role: 'auditeur',
  roles: ['auditeur'],
  permissions: [],
};

const TARGET_ID = '11111111-1111-4111-8111-111111111111';

function post(app: Hono, body: unknown) {
  return app.request('/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/payments guard & validation', () => {
  it('forbids an auditeur (read-only role)', async () => {
    const spy = mock(() => {});
    const res = await post(buildApp(auditeur, spy), {
      targetType: 'invoice',
      targetId: TARGET_ID,
    });
    expect(res.status).toBe(403);
    expect(spy).not.toHaveBeenCalled();
  });

  it('allows an integrateur (owns factures/commandes)', async () => {
    let received: unknown;
    const res = await post(
      buildApp(integrateur, (input) => {
        received = input;
      }),
      { targetType: 'order', targetId: TARGET_ID }
    );
    expect(res.status).toBe(201);
    expect(received).toMatchObject({ targetType: 'order' });
  });

  it('rejects an unknown target type with 400', async () => {
    const spy = mock(() => {});
    const res = await post(buildApp(admin, spy), { targetType: 'subscription', targetId: TARGET_ID });
    expect(res.status).toBe(400);
    expect(spy).not.toHaveBeenCalled();
  });

  it('rejects a non-uuid target id with 400', async () => {
    const spy = mock(() => {});
    const res = await post(buildApp(commercial, spy), { targetType: 'order', targetId: 'nope' });
    expect(res.status).toBe(400);
    expect(spy).not.toHaveBeenCalled();
  });

  it('rejects an out-of-range deposit percent with 400', async () => {
    const spy = mock(() => {});
    const res = await post(buildApp(admin, spy), {
      targetType: 'quote_deposit',
      targetId: TARGET_ID,
      depositPercent: 200,
    });
    expect(res.status).toBe(400);
    expect(spy).not.toHaveBeenCalled();
  });

  it('accepts a valid invoice payment from a commercial', async () => {
    let received: unknown;
    const res = await post(
      buildApp(commercial, (input) => {
        received = input;
      }),
      { targetType: 'invoice', targetId: TARGET_ID }
    );
    expect(res.status).toBe(201);
    expect(received).toEqual({ targetType: 'invoice', targetId: TARGET_ID });
  });

  it('accepts a quote deposit with a valid percent from an admin', async () => {
    let received: unknown;
    const res = await post(
      buildApp(admin, (input) => {
        received = input;
      }),
      { targetType: 'quote_deposit', targetId: TARGET_ID, depositPercent: 40 }
    );
    expect(res.status).toBe(201);
    expect(received).toMatchObject({ targetType: 'quote_deposit', depositPercent: 40 });
  });
});
