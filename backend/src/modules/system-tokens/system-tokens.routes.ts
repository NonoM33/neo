import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { authMiddleware } from '../../middleware/auth.middleware';
import { requireAdmin } from '../../middleware/rbac.middleware';
import type { JWTPayload } from '../../middleware/auth.middleware';
import { createToken, listTokens, revokeToken } from './system-tokens.service';

export const createTokenSchema = z.object({
  name: z.string().trim().min(1, 'Le nom est requis').max(120),
  roleIds: z.array(z.string().uuid()).min(1, 'Au moins un rôle est requis'),
});

const systemTokensRouter = new Hono();

// API tokens administration is admin-only.
systemTokensRouter.use('*', authMiddleware, requireAdmin());

// GET /api/system-tokens - list tokens (never exposes the secret)
systemTokensRouter.get('/', async (c) => {
  const tokens = await listTokens();
  return c.json(tokens);
});

// POST /api/system-tokens - create a token; returns the raw secret ONCE
systemTokensRouter.post('/', zValidator('json', createTokenSchema), async (c) => {
  const input = c.req.valid('json');
  const user = c.get('user') as JWTPayload;
  const { id, raw } = await createToken({
    name: input.name,
    roleIds: input.roleIds,
    createdBy: user.userId,
    createdByEmail: user.email,
  });
  return c.json({ id, raw }, 201);
});

// POST /api/system-tokens/:id/revoke - revoke a token
systemTokensRouter.post('/:id/revoke', async (c) => {
  await revokeToken(c.req.param('id'));
  return c.json({ message: 'Jeton révoqué' });
});

export default systemTokensRouter;
