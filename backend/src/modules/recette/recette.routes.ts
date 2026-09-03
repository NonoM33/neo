import { Hono, type Context } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { isRecetteEnabled } from '../../config/env';
import { authMiddleware, type JWTPayload } from '../../middleware/auth.middleware';
import { requireRole, isAdmin } from '../../middleware/rbac.middleware';
import { ForbiddenError, NotFoundError } from '../../lib/errors';
import * as recetteService from './recette.service';
import {
  recetteFilterSchema,
  createFeedbackSchema,
  updateFeedbackStatusSchema,
  updateFeatureValidationSchema,
} from './recette.schema';

// ---------------------------------------------------------------------------
// Staff API for the recette (QA) centre. STG/dev only — hidden in production.
// Read access: admin + auditeur. Mutations: admin only.
// ---------------------------------------------------------------------------

const recetteRouter = new Hono();

// Hide the whole surface in production.
recetteRouter.use('*', async (c, next) => {
  if (!isRecetteEnabled) return c.notFound();
  return next();
});

recetteRouter.use('*', authMiddleware, requireRole('admin', 'auditeur'));

function assertAdmin(c: Context): JWTPayload {
  const user = c.get('user') as JWTPayload;
  if (!isAdmin(user)) {
    throw new ForbiddenError('Action réservée aux administrateurs');
  }
  return user;
}

// GET /api/recette/summary
recetteRouter.get('/summary', async (c) => {
  const summary = await recetteService.getSummary();
  return c.json(summary);
});

// GET /api/recette/catalogue?app&status&severity&validation
recetteRouter.get('/catalogue', zValidator('query', recetteFilterSchema), async (c) => {
  const filters = c.req.valid('query');
  const catalogue = await recetteService.getCatalogueWithFeedback(filters);
  return c.json(catalogue);
});

// POST /api/recette/feedback (admin)
recetteRouter.post('/feedback', zValidator('json', createFeedbackSchema), async (c) => {
  const user = assertAdmin(c);
  const body = c.req.valid('json');
  const created = await recetteService.createFeedback({
    featureId: body.featureId,
    title: body.title,
    severity: body.severity,
    stepsToReproduce: body.stepsToReproduce,
    expectedResult: body.expectedResult,
    actualResult: body.actualResult,
    author: user.email,
  });
  return c.json(created, 201);
});

// PATCH /api/recette/feedback/:id/status (admin)
recetteRouter.patch(
  '/feedback/:id/status',
  zValidator('json', updateFeedbackStatusSchema),
  async (c) => {
    assertAdmin(c);
    const id = c.req.param('id');
    const existing = await recetteService.getFeedbackById(id);
    if (!existing) throw new NotFoundError('Retour de recette');
    const { status } = c.req.valid('json');
    await recetteService.updateFeedbackStatus(id, status);
    return c.json({ id, status });
  },
);

// PATCH /api/recette/features/:id/validation (admin)
recetteRouter.patch(
  '/features/:id/validation',
  zValidator('json', updateFeatureValidationSchema),
  async (c) => {
    const user = assertAdmin(c);
    const id = c.req.param('id');
    const { validationStatus } = c.req.valid('json');
    await recetteService.updateFeatureValidation(id, validationStatus, user.email);
    return c.json({ id, validationStatus });
  },
);

// DELETE /api/recette/feedback/:id (admin)
recetteRouter.delete('/feedback/:id', async (c) => {
  assertAdmin(c);
  const id = c.req.param('id');
  const existing = await recetteService.getFeedbackById(id);
  if (!existing) throw new NotFoundError('Retour de recette');
  await recetteService.deleteFeedback(id);
  return c.json({ ok: true });
});

export default recetteRouter;
