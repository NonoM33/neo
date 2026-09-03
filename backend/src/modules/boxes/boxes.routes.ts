import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { authMiddleware, type JWTPayload } from '../../middleware/auth.middleware';
import { requireAdmin, requireIntegrateurOrAdmin } from '../../middleware/rbac.middleware';
import { paginationSchema } from '../../lib/pagination';
import { boxAuthMiddleware } from './box-auth.middleware';
import {
  announceSchema,
  boxFilterSchema,
  claimSchema,
  heartbeatSchema,
  supportFilterSchema,
} from './boxes.schema';
import * as service from './boxes.service';

const boxesRouter = new Hono();

// ============ Depuis la box, sans cle (1er boot) ============

// POST /api/boxes/announce - la box se presente avec son jeton ; recoit sa cle une fois rattachee
boxesRouter.post('/announce', zValidator('json', announceSchema), async (c) => {
  return c.json(await service.announceBox(c.req.valid('json')));
});

// ============ Depuis la box, avec sa cle neo_box_... ============

const boxRouter = new Hono();
boxRouter.use('*', boxAuthMiddleware(service.findBoxByApiKeyHash));

boxRouter.post('/heartbeat', zValidator('json', heartbeatSchema), async (c) => {
  return c.json(await service.recordHeartbeat(c.get('box'), c.req.valid('json')));
});

boxRouter.post('/support-requests', async (c) => {
  return c.json(await service.requestSupport(c.get('box')), 201);
});

boxesRouter.route('/me', boxRouter);

// ============ Depuis l'app installateur ============

// POST /api/boxes/claim - rattache la box scannee a un client
boxesRouter.post(
  '/claim',
  authMiddleware,
  requireIntegrateurOrAdmin(),
  zValidator('json', claimSchema),
  async (c) => {
    const user = c.get('user') as JWTPayload;
    return c.json(await service.claimBox(c.req.valid('json'), user.userId), 201);
  },
);

// ============ Administration ============

const adminRouter = new Hono();
adminRouter.use('*', authMiddleware, requireAdmin());

adminRouter.get('/', zValidator('query', paginationSchema.merge(boxFilterSchema)), async (c) => {
  const { page, limit, ...filters } = c.req.valid('query');
  return c.json(await service.listBoxes({ page, limit }, filters));
});

adminRouter.get('/stats', async (c) => c.json(await service.getBoxStats()));

adminRouter.get('/support-requests', zValidator('query', supportFilterSchema), async (c) => {
  return c.json(await service.listSupportRequests(c.req.valid('query')));
});

adminRouter.post(
  '/support-requests/:id/close',
  zValidator('json', z.object({ note: z.string().max(2000).optional() }).default({})),
  async (c) => {
    const user = c.get('user') as JWTPayload;
    const { note } = c.req.valid('json');
    return c.json(await service.closeSupportRequest(c.req.param('id'), user.userId, note));
  },
);

adminRouter.get('/:id', async (c) => c.json(await service.getBox(c.req.param('id'))));

adminRouter.post('/:id/revoke', async (c) => c.json(await service.revokeBox(c.req.param('id'))));

boxesRouter.route('/', adminRouter);

export default boxesRouter;
