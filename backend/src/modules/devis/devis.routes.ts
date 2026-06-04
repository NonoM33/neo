import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { publicDevisSchema } from './devis.schema';
import * as devisService from './devis.service';
import { rateLimit } from '../../middleware/rate-limit.middleware';

const devisRouter = new Hono();

// Anti-spam : 5 demandes / minute / IP
devisRouter.use('/', rateLimit({ maxRequests: 5, windowMs: 60_000 }));

// ─── POST /api/public/devis ──────────────────────────────────────────────────
devisRouter.post('/', zValidator('json', publicDevisSchema), async (c) => {
  const input = c.req.valid('json');
  const result = await devisService.createDevisRequest(input);
  return c.json(result, 201);
});

export default devisRouter;
