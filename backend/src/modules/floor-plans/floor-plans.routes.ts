import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { createFloorPlanSchema, updateFloorPlanSchema } from './floor-plans.schema';
import * as floorPlansService from './floor-plans.service';
import { authMiddleware } from '../../middleware/auth.middleware';
import { requireIntegrateurOrAdmin } from '../../middleware/rbac.middleware';
import { ValidationError } from '../../lib/errors';

const floorPlansRouter = new Hono();

floorPlansRouter.use('*', authMiddleware, requireIntegrateurOrAdmin());

// Get floor plan for a room
floorPlansRouter.get('/pieces/:roomId/plan', async (c) => {
  const roomId = c.req.param('roomId');
  const user = c.get('user');
  const plan = await floorPlansService.getFloorPlanByRoom(roomId, user.userId, user.role);
  if (!plan) {
    return c.json(null, 200);
  }
  return c.json(plan);
});

// Upsert (create or replace) floor plan for a room
floorPlansRouter.post(
  '/pieces/:roomId/plan',
  zValidator('json', createFloorPlanSchema),
  async (c) => {
    const roomId = c.req.param('roomId');
    const input = c.req.valid('json');
    const user = c.get('user');
    const plan = await floorPlansService.upsertFloorPlan(roomId, input, user.userId, user.role);
    return c.json(plan, 201);
  },
);

// Update floor plan by ID
floorPlansRouter.put(
  '/plans/:id',
  zValidator('json', updateFloorPlanSchema),
  async (c) => {
    const id = c.req.param('id');
    const input = c.req.valid('json');
    const user = c.get('user');
    const plan = await floorPlansService.updateFloorPlan(id, input, user.userId, user.role);
    return c.json(plan);
  },
);

// Delete floor plan by ID
floorPlansRouter.delete('/plans/:id', async (c) => {
  const id = c.req.param('id');
  const user = c.get('user');
  await floorPlansService.deleteFloorPlan(id, user.userId, user.role);
  return c.json({ message: 'Plan supprimé' });
});

// Upload USDZ 3D model for a floor plan
floorPlansRouter.post('/plans/:id/usdz', async (c) => {
  const id = c.req.param('id');
  const user = c.get('user');

  const formData = await c.req.formData();
  const file = formData.get('file') as File | null;

  if (!file) {
    throw new ValidationError('Fichier requis');
  }

  const allowedTypes = ['model/vnd.usdz+zip', 'application/octet-stream', 'application/zip'];
  if (!allowedTypes.includes(file.type) && !file.name.endsWith('.usdz')) {
    throw new ValidationError('Type de fichier non supporté. Format accepté: USDZ');
  }

  const maxSize = 100 * 1024 * 1024; // 100MB
  if (file.size > maxSize) {
    throw new ValidationError('Fichier trop volumineux. Maximum 100MB');
  }

  const plan = await floorPlansService.uploadUsdzFile(id, file, user.userId, user.role);
  return c.json(plan);
});

export default floorPlansRouter;
