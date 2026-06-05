import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import {
  listTemplates,
  getTemplate,
  updateTemplate,
  resetTemplate,
  previewTemplate,
} from './templates.service';
import { authMiddleware } from '../../middleware/auth.middleware';
import { requireAdmin } from '../../middleware/rbac.middleware';

/**
 * Routes d'administration des templates (emails + documents devis/facture).
 * Réservées aux admins : édition visuelle GrapesJS côté front, rendu Handlebars
 * côté back. Le `preview` interpole les données d'exemple pour un aperçu fidèle.
 */

const updateSchema = z.object({
  html: z.string().min(1),
  subject: z.string().nullable().optional(),
  gjsData: z.unknown().optional(),
});

const previewSchema = z.object({
  html: z.string().optional(),
  subject: z.string().nullable().optional(),
});

const templatesRouter = new Hono();

templatesRouter.use('/*', authMiddleware, requireAdmin());

// GET / - Liste des templates (defaults + customisations)
templatesRouter.get('/', async (c) => {
  return c.json(await listTemplates());
});

// GET /:key - Détail d'un template
templatesRouter.get('/:key', async (c) => {
  return c.json(await getTemplate(c.req.param('key')));
});

// PUT /:key - Enregistre une customisation
templatesRouter.put('/:key', zValidator('json', updateSchema), async (c) => {
  const input = c.req.valid('json');
  return c.json(await updateTemplate(c.req.param('key'), input));
});

// POST /:key/preview - Aperçu rendu avec les données d'exemple
templatesRouter.post('/:key/preview', zValidator('json', previewSchema), async (c) => {
  const input = c.req.valid('json');
  return c.json(await previewTemplate(c.req.param('key'), input));
});

// POST /:key/reset - Revient au template par défaut
templatesRouter.post('/:key/reset', async (c) => {
  return c.json(await resetTemplate(c.req.param('key')));
});

export default templatesRouter;
