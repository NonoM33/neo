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
//
// Les gardes sont posees route par route (pas de `use('*')` sur un sous-routeur
// monte a la racine) : un middleware global ici s'appliquerait AUSSI a /announce,
// que la box appelle sans aucune cle — et l'enrolement serait impossible.

boxesRouter.get(
  '/',
  authMiddleware,
  requireAdmin(),
  zValidator('query', paginationSchema.merge(boxFilterSchema)),
  async (c) => {
    const { page, limit, ...filters } = c.req.valid('query');
    return c.json(await service.listBoxes({ page, limit }, filters));
  },
);

boxesRouter.get('/stats', authMiddleware,
  requireAdmin(), async (c) => c.json(await service.getBoxStats()));

boxesRouter.get(
  '/support-requests',
  authMiddleware,
  requireAdmin(),
  zValidator('query', supportFilterSchema),
  async (c) => c.json(await service.listSupportRequests(c.req.valid('query'))),
);

boxesRouter.post(
  '/support-requests/:id/close',
  authMiddleware,
  requireAdmin(),
  zValidator('json', z.object({ note: z.string().max(2000).optional() }).default({})),
  async (c) => {
    const user = c.get('user') as JWTPayload;
    const { note } = c.req.valid('json');
    return c.json(await service.closeSupportRequest(c.req.param('id'), user.userId, note));
  },
);

// `param('id')` est type `string | undefined` des qu'un middleware precede le
// handler : le motif de route garantit pourtant sa presence.
boxesRouter.get('/:id', authMiddleware, requireAdmin(), async (c) => {
  const id = c.req.param('id') as string;
  return c.json(await service.getBox(id));
});

boxesRouter.post('/:id/support-session', authMiddleware, requireAdmin(), async (c) => {
  const id = c.req.param('id') as string;
  return c.json(await service.openSupportSession(id));
});

boxesRouter.post('/:id/revoke', authMiddleware, requireAdmin(), async (c) => {
  const id = c.req.param('id') as string;
  return c.json(await service.revokeBox(id));
});

export default boxesRouter;
