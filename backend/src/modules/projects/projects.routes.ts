import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import {
  createClientSchema,
  updateClientSchema,
  createProjectSchema,
  updateProjectSchema,
  projectFilterSchema,
  assignProjectSchema,
} from './projects.schema';
import * as projectsService from './projects.service';
import { authMiddleware } from '../../middleware/auth.middleware';
import {
  requireAuditeur,
  requireIntegrateurOrAdmin,
} from '../../middleware/rbac.middleware';
import { paginationSchema } from '../../lib/pagination';

const projectsRouter = new Hono();

// Lecture ouverte a toute l'equipe terrain : l'auditeur doit voir le projet
// qu'on lui a confie. L'ecriture reste au metier, route par route.
projectsRouter.use('*', authMiddleware, requireAuditeur());

// ============ Clients Routes ============

projectsRouter.get(
  '/clients',
  zValidator('query', paginationSchema.merge(z.object({ search: z.string().optional() }))),
  async (c) => {
    const { page, limit, search } = c.req.valid('query');
    const result = await projectsService.getClients({ page, limit }, search);
    return c.json(result);
  }
);

projectsRouter.get('/clients/:id', async (c) => {
  const id = c.req.param('id');
  const client = await projectsService.getClientById(id);
  return c.json(client);
});

projectsRouter.post('/clients', requireIntegrateurOrAdmin(), zValidator('json', createClientSchema), async (c) => {
  const input = c.req.valid('json');
  const client = await projectsService.createClient(input);
  return c.json(client, 201);
});

projectsRouter.put('/clients/:id', requireIntegrateurOrAdmin(), zValidator('json', updateClientSchema), async (c) => {
  const id = c.req.param('id');
  const input = c.req.valid('json');
  const client = await projectsService.updateClient(id, input);
  return c.json(client);
});

projectsRouter.delete('/clients/:id', requireIntegrateurOrAdmin(), async (c) => {
  const id = c.req.param('id')!;
  await projectsService.deleteClient(id);
  return c.json({ message: 'Client supprimé' });
});

// ============ Projects Routes ============

projectsRouter.get(
  '/',
  zValidator('query', paginationSchema.merge(projectFilterSchema)),
  async (c) => {
    const { page, limit, ...filters } = c.req.valid('query');
    const user = c.get('user');
    const result = await projectsService.getProjects(
      { page, limit },
      filters,
      user.userId,
      user.role
    );
    return c.json(result);
  }
);

projectsRouter.get('/:id', async (c) => {
  const id = c.req.param('id');
  const user = c.get('user');
  const project = await projectsService.getProjectById(id, user.userId, user.role);
  return c.json(project);
});

projectsRouter.post('/', requireIntegrateurOrAdmin(), zValidator('json', createProjectSchema), async (c) => {
  const input = c.req.valid('json');
  const user = c.get('user');
  const project = await projectsService.createProject(input, user.userId);
  return c.json(project, 201);
});

projectsRouter.put('/:id', requireIntegrateurOrAdmin(), zValidator('json', updateProjectSchema), async (c) => {
  const id = c.req.param('id');
  const input = c.req.valid('json');
  const user = c.get('user');
  const project = await projectsService.updateProject(id, input, user.userId, user.role);
  return c.json(project);
});

projectsRouter.delete('/:id', requireIntegrateurOrAdmin(), async (c) => {
  const id = c.req.param('id')!;
  const user = c.get('user');
  await projectsService.deleteProject(id, user.userId, user.role);
  return c.json({ message: 'Projet supprimé' });
});

// Confier un projet a quelqu'un d'autre (ou le rendre)
projectsRouter.put(
  '/:id/assigner',
  zValidator('json', assignProjectSchema),
  async (c) => {
    const id = c.req.param('id');
    const { assignedToId } = c.req.valid('json');
    const user = c.get('user');
    const projet = await projectsService.assignProject(
      id,
      assignedToId ?? null,
      user.userId,
      user.role,
    );
    return c.json(projet);
  },
);

export default projectsRouter;
