import { Hono } from 'hono';
import { z } from 'zod';
import {
  submitWidgetFeedback,
  getFeedbackByReporter,
} from '../recette/recette.service';
import {
  recetteKindLabels,
  recetteSeverityLabels,
  recetteStatusLabels,
} from '../../db/schema';

const contextSchema = z
  .object({
    url: z.string().optional(),
    route: z.string().optional(),
    referrer: z.string().optional(),
    userAgent: z.string().optional(),
    platform: z.string().optional(),
    language: z.string().optional(),
    viewport: z.object({ width: z.number(), height: z.number() }).optional(),
    screen: z.object({ width: z.number(), height: z.number() }).optional(),
    devicePixelRatio: z.number().optional(),
    appVersion: z.string().optional(),
    capturedAt: z.string().optional(),
    logs: z
      .array(
        z.object({
          level: z.string(),
          message: z.string(),
          at: z.string(),
        })
      )
      .optional(),
  })
  .optional();

const submitSchema = z.object({
  app: z.enum(['admin', 'crm', 'flutter', 'site']),
  kind: z.enum(['bug', 'amelioration']).default('bug'),
  title: z.string().trim().min(3).max(300),
  severity: z
    .enum(['bloquant', 'majeur', 'mineur', 'cosmetique'])
    .default('majeur'),
  description: z.string().trim().max(5000).optional(),
  expectedResult: z.string().trim().max(5000).optional(),
  stepsToReproduce: z.string().trim().max(5000).optional(),
  reporterEmail: z.string().trim().email().max(200).optional().or(z.literal('')),
  reporterName: z.string().trim().max(120).optional(),
  context: contextSchema,
});

// Routes publiques du widget de feedback terrain (CORS ouvert, sans auth).
const feedbackApiRoutes = new Hono();

feedbackApiRoutes.post('/submit', async (c) => {
  const json = await c.req.json().catch(() => null);
  const parsed = submitSchema.safeParse(json);
  if (!parsed.success) {
    return c.json(
      { error: 'invalid_payload', details: parsed.error.flatten() },
      400
    );
  }
  const data = parsed.data;
  // Une amelioration n'a pas de "severite bloquante" par defaut.
  const severity =
    data.kind === 'amelioration' && data.severity === 'majeur'
      ? 'mineur'
      : data.severity;

  const created = await submitWidgetFeedback({
    app: data.app,
    kind: data.kind,
    title: data.title,
    severity,
    description: data.description,
    expectedResult: data.expectedResult,
    stepsToReproduce: data.stepsToReproduce,
    reporterEmail: data.reporterEmail || undefined,
    reporterName: data.reporterName,
    context: data.context,
  });

  return c.json({ ok: true, id: created.id, status: created.status }, 201);
});

feedbackApiRoutes.get('/mine', async (c) => {
  const email = c.req.query('email')?.trim().toLowerCase();
  if (!email) return c.json({ error: 'email_required' }, 400);

  const items = await getFeedbackByReporter(email);
  return c.json({
    items: items.map((fb) => ({
      id: fb.id,
      title: fb.title,
      kind: fb.kind,
      kindLabel: recetteKindLabels[fb.kind].label,
      severity: fb.severity,
      severityLabel: recetteSeverityLabels[fb.severity].label,
      status: fb.status,
      statusLabel: recetteStatusLabels[fb.status].label,
      createdAt: fb.createdAt,
      updatedAt: fb.updatedAt,
      comments: fb.comments.map((com) => ({
        author: com.author,
        body: com.body,
        createdAt: com.createdAt,
      })),
    })),
  });
});

// Sert le widget JS (charge par <script src="/feedback-widget.js">).
const feedbackWidgetRoutes = new Hono();
const widgetPath = import.meta.dir + '/feedback-widget.js';

feedbackWidgetRoutes.get('/feedback-widget.js', async (c) => {
  const js = await Bun.file(widgetPath).text();
  return c.body(js, 200, {
    'Content-Type': 'application/javascript; charset=utf-8',
    'Cache-Control': 'public, max-age=300',
    'Access-Control-Allow-Origin': '*',
  });
});

export { feedbackApiRoutes, feedbackWidgetRoutes };
