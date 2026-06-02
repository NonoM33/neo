import { Hono } from 'hono';
import { env, isRecetteEnabled } from '../../config/env';
import * as recetteService from './recette.service';

// Endpoint de lecture des retours destine a Claude (curl depuis STG).
// Protege par RECETTE_EXPORT_TOKEN, hors du mur de session admin.
const recetteExportRoutes = new Hono();

recetteExportRoutes.get('/export', async (c) => {
  if (!isRecetteEnabled) {
    return c.json({ error: 'recette_disabled' }, 404);
  }
  if (!env.RECETTE_EXPORT_TOKEN) {
    return c.json({ error: 'export_token_not_configured' }, 503);
  }
  const token = c.req.query('token');
  if (token !== env.RECETTE_EXPORT_TOKEN) {
    return c.json({ error: 'unauthorized' }, 401);
  }

  const onlyOpen = c.req.query('open') === '1' || c.req.query('open') === 'true';
  const [feedback, summary] = await Promise.all([
    recetteService.exportFeedback(onlyOpen),
    recetteService.getSummary(),
  ]);

  return c.json({ summary, feedback });
});

// Marque un retour comme corrige (ou autre statut) + ajoute un commentaire.
// Permet a Claude de cloturer les retours apres correction depuis le CLI.
const RESOLVE_STATUSES = ['ouvert', 'corrige', 'valide', 'a_revoir'] as const;

recetteExportRoutes.post('/feedback/:id/resolve', async (c) => {
  if (!isRecetteEnabled) return c.json({ error: 'recette_disabled' }, 404);
  if (!env.RECETTE_EXPORT_TOKEN) {
    return c.json({ error: 'export_token_not_configured' }, 503);
  }
  if (c.req.query('token') !== env.RECETTE_EXPORT_TOKEN) {
    return c.json({ error: 'unauthorized' }, 401);
  }

  const id = c.req.param('id');
  const feedback = await recetteService.getFeedbackById(id);
  if (!feedback) return c.json({ error: 'not_found' }, 404);

  const body = await c.req.json<{ comment?: string; status?: string; author?: string }>();
  const status = RESOLVE_STATUSES.includes(body.status as never)
    ? (body.status as (typeof RESOLVE_STATUSES)[number])
    : 'corrige';
  const author = body.author?.trim() || 'Claude';

  await recetteService.updateFeedbackStatus(id, status);
  if (body.comment?.trim()) {
    await recetteService.addComment(id, author, body.comment.trim());
  }

  return c.json({ ok: true, id, status });
});

export default recetteExportRoutes;
