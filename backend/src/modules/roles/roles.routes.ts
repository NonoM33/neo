import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { authMiddleware } from '../../middleware/auth.middleware';
import { requireAdmin } from '../../middleware/rbac.middleware';
import {
  listRoles,
  getRole,
  createRole,
  updateRole,
  deleteRole,
  RoleValidationError,
} from './roles.service';
import { groupedPermissions } from './permissions';

export const roleBodySchema = z.object({
  name: z.string().trim().min(1, 'Le nom du rôle est requis').max(50),
  description: z.string().max(255).optional(),
  permissions: z.array(z.string()).default([]),
});

const rolesRouter = new Hono();

// Roles & permissions administration is admin-only.
rolesRouter.use('*', authMiddleware, requireAdmin());

// GET /api/roles/permissions - permission catalog, grouped for checkbox rendering
rolesRouter.get('/permissions', (c) => c.json(groupedPermissions()));

// GET /api/roles - list every role
rolesRouter.get('/', async (c) => {
  const roles = await listRoles();
  return c.json(roles);
});

// GET /api/roles/:id - single role
rolesRouter.get('/:id', async (c) => {
  const role = await getRole(c.req.param('id'));
  if (!role) {
    return c.json({ error: 'Rôle introuvable' }, 404);
  }
  return c.json(role);
});

// POST /api/roles - create a custom role
rolesRouter.post('/', zValidator('json', roleBodySchema), async (c) => {
  try {
    const role = await createRole(c.req.valid('json'));
    return c.json(role, 201);
  } catch (err) {
    if (err instanceof RoleValidationError) {
      return c.json({ error: err.message }, 400);
    }
    throw err;
  }
});

// PUT /api/roles/:id - update a role
rolesRouter.put('/:id', zValidator('json', roleBodySchema), async (c) => {
  try {
    const role = await updateRole(c.req.param('id'), c.req.valid('json'));
    return c.json(role);
  } catch (err) {
    if (err instanceof RoleValidationError) {
      const status = err.message === 'Rôle introuvable' ? 404 : 400;
      return c.json({ error: err.message }, status);
    }
    throw err;
  }
});

// DELETE /api/roles/:id - delete a custom role (system roles are protected)
rolesRouter.delete('/:id', async (c) => {
  try {
    await deleteRole(c.req.param('id'));
    return c.json({ message: 'Rôle supprimé' });
  } catch (err) {
    if (err instanceof RoleValidationError) {
      return c.json({ error: err.message }, 400);
    }
    throw err;
  }
});

export default rolesRouter;
