import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { estimateSchema, saveSchema, submitSchema } from './configurateur.schema';
import * as configurateurService from './configurateur.service';
import { rateLimit } from '../../middleware/rate-limit.middleware';

const configurateurRouter = new Hono();

// ─── GET /api/public/configurateur/catalogue ──────────────────────────────
configurateurRouter.get('/catalogue', async (c) => {
  const categories = await configurateurService.getConfiguratorCatalog();
  return c.json({ categories });
});

// ─── POST /api/public/configurateur/estimer ───────────────────────────────
// Recalcul du prix à chaque clic : limite généreuse.
configurateurRouter.post(
  '/estimer',
  rateLimit({ maxRequests: 60, windowMs: 60_000 }),
  zValidator('json', estimateSchema),
  async (c) => {
    const input = c.req.valid('json');
    const estimate = await configurateurService.estimateConfiguration(input);
    return c.json(estimate);
  },
);

// ─── POST /api/public/configurateur/sauvegarder ───────────────────────────
// Persiste la config et renvoie un code partageable + lien de reprise + QR.
configurateurRouter.post(
  '/sauvegarder',
  rateLimit({ maxRequests: 20, windowMs: 60_000 }),
  zValidator('json', saveSchema),
  async (c) => {
    const input = c.req.valid('json');
    const result = await configurateurService.saveDraft(input);
    return c.json(result, 201);
  },
);

// ─── GET /api/public/configurateur/code/:code ─────────────────────────────
// Recharge une configuration sauvegardée (réhydratation du wizard).
configurateurRouter.get('/code/:code', async (c) => {
  const code = c.req.param('code');
  const draft = await configurateurService.getDraftByCode(code);
  return c.json(draft);
});

// ─── POST /api/public/configurateur/soumettre ─────────────────────────────
configurateurRouter.post(
  '/soumettre',
  rateLimit({ maxRequests: 5, windowMs: 60_000 }),
  zValidator('json', submitSchema),
  async (c) => {
    const input = c.req.valid('json');
    const result = await configurateurService.submitConfiguration(input);
    return c.json(result, 201);
  },
);

export default configurateurRouter;
